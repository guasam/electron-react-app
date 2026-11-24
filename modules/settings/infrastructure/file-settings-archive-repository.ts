import { constants } from 'node:fs'
import { open, realpath, rename, unlink, lstat } from 'node:fs/promises'
import { basename, dirname, join, relative, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'
import { AppError } from '../../../shared/domain/errors'
import type { SettingsArchiveRepository } from '../domain/repositories'

export interface ArchiveChooser {
  open(): Promise<string | null>
  save(): Promise<string | null>
}
const LIMIT = 5 * 1024 * 1024
function within(directory: string, target: string) {
  const path = relative(directory, target)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

export class FileSettingsArchiveRepository implements SettingsArchiveRepository {
  constructor(
    private readonly chooser: ArchiveChooser,
    private readonly protectedDirectory: string,
    private readonly signal: AbortSignal,
    private readonly replace: typeof rename = rename
  ) {}
  async read(): Promise<string | null> {
    const path = await this.chooser.open()
    if (!path || this.signal.aborted) return null
    try {
      // Reject nonregular paths before open; O_NONBLOCK also avoids a raced FIFO blocking on POSIX.
      if (!(await lstat(path)).isFile() && !(await lstat(path)).isSymbolicLink())
        throw new AppError('INVALID_ARCHIVE', 'Choose a regular JSON file.')
      const file = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0))
      try {
        const metadata = await file.stat()
        if (!metadata.isFile()) throw new AppError('INVALID_ARCHIVE', 'Choose a regular JSON file.')
        if (metadata.size > LIMIT) throw new AppError('ARCHIVE_LIMIT', 'Archives must be at most 5 MiB.')
        const buffer = Buffer.alloc(LIMIT + 1)
        let offset = 0
        while (offset < buffer.length) {
          if (this.signal.aborted) return null
          const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, null)
          if (!bytesRead) break
          offset += bytesRead
        }
        if (offset > LIMIT) throw new AppError('ARCHIVE_LIMIT', 'Archives must be at most 5 MiB.')
        return this.signal.aborted ? null : new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, offset))
      } finally {
        await file.close()
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('ARCHIVE_IO', 'The archive could not be read. Check the file and try again.')
    }
  }
  private async destination(path: string) {
    const protectedRoot = await realpath(this.protectedDirectory),
      parent = await realpath(dirname(path)),
      resolved = join(parent, basename(path))
    let target = resolved
    try {
      target = await realpath(resolved)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (within(protectedRoot, parent) || within(protectedRoot, target))
      throw new AppError('PROTECTED_DESTINATION', 'Choose a location outside the application database directory.')
    return resolved
  }
  async write(contents: string): Promise<boolean> {
    if (Buffer.byteLength(contents, 'utf8') > LIMIT)
      throw new AppError('ARCHIVE_LIMIT', 'Archives must be at most 5 MiB.')
    const selected = await this.chooser.save()
    if (!selected || this.signal.aborted) return false
    let temporary: string | undefined
    try {
      const target = await this.destination(selected)
      temporary = join(dirname(target), `.settings-${randomUUID()}.tmp`)
      const file = await open(temporary, 'wx', 0o600)
      try {
        await file.writeFile(contents, 'utf8')
        await file.sync()
      } finally {
        await file.close()
      }
      if (this.signal.aborted) return false
      // Recheck resolved containment immediately before replacement.
      if ((await this.destination(selected)) !== target)
        throw new AppError('PROTECTED_DESTINATION', 'The destination changed. Choose a location again.')
      await this.replace(temporary, target)
      temporary = undefined
      return true
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('ARCHIVE_IO', 'The archive could not be saved. The previous export has been preserved.')
    } finally {
      if (temporary) await unlink(temporary).catch(() => {})
    }
  }
}
