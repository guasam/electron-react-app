import { protocol, net } from 'electron'
import { resolve, relative, isAbsolute } from 'node:path'
import { realpath } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export function registerAppSchemes() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ])
}
export function registerAppProtocols(rendererRoot: string, resourceRoot: string) {
  const serve = async (root: string, path: string) => {
    try {
      const base = await realpath(root),
        target = await realpath(resolve(base, `.${path}`)),
        tail = relative(base, target)
      if (tail.startsWith('..') || isAbsolute(tail)) return new Response('Not found', { status: 404 })
      return net.fetch(pathToFileURL(target).href)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  }
  protocol.handle('app', (request) => {
    try {
      const url = new URL(request.url)
      return url.hostname === 'starter'
        ? serve(rendererRoot, decodeURIComponent(url.pathname))
        : new Response('Not found', { status: 404 })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
  protocol.handle('res', (request) => {
    try {
      const url = new URL(request.url)
      return serve(resourceRoot, `/${url.hostname}${decodeURIComponent(url.pathname)}`)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
