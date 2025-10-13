import { safeStorage } from 'electron'
import { eq, and } from 'drizzle-orm'
import { DatabaseService } from './database.service'
import { apiKeys } from '@/lib/main/db/schema'
import { sql } from 'drizzle-orm'

export class ApiKeyService {
  constructor(private dbService: DatabaseService) {}

  async save(apiKey: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system')
    }

    const encrypted = safeStorage.encryptString(apiKey)
    const encryptedBase64 = encrypted.toString('base64')

    // Check if key exists
    const existing = await this.dbService.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.provider, 'openai'))
      .limit(1)
      .then((rows) => rows[0])

    if (existing) {
      // Update existing key
      await this.dbService.db
        .update(apiKeys)
        .set({
          encryptedKey: encryptedBase64,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.provider, 'openai'))
    } else {
      // Insert new key
      await this.dbService.db.insert(apiKeys).values({
        provider: 'openai',
        encryptedKey: encryptedBase64,
      })
    }
  }

  async get(): Promise<string | null> {
    const apiKeyRecord = await this.dbService.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.provider, 'openai'), eq(apiKeys.isActive, true)))
      .limit(1)
      .then((rows) => rows[0])

    if (!apiKeyRecord) return null

    const decrypted = safeStorage.decryptString(Buffer.from(apiKeyRecord.encryptedKey, 'base64'))

    return decrypted
  }

  async exists(): Promise<boolean> {
    const count = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(apiKeys)
      .where(and(eq(apiKeys.provider, 'openai'), eq(apiKeys.isActive, true)))
      .then((result) => result[0].count)

    return count > 0
  }

  async delete() {
    await this.dbService.db
      .update(apiKeys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(apiKeys.provider, 'openai'))
  }
}
