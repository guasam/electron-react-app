import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'
import { ApiError, GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { ConveyorError } from 'electron-conveyor/define'
import { defineModule, stream, query, command } from '../init'

// Gemini's free tier needs only a Google account (aistudio.google.com/apikey), no card, which is
// what makes live mode reachable for anyone who clones this starter kit.
const MODEL = 'gemini-2.5-flash'

// ================================================================
// KEY STORE
// ================================================================
// The key never crosses back to the renderer. It is sealed with the
// OS keychain (Keychain / libsecret / DPAPI) and read only in main —
// `source` reports where a key came from, never what it is.

/** Resolved per call: `app.getPath` throws if the app isn't ready yet. */
const keyFile = () => join(app.getPath('userData'), 'gemini.key')

function storedKey(): string | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(readFileSync(keyFile()))
  } catch {
    // No file yet, or ciphertext this OS user can no longer unseal (keychain reset, copied profile).
    return null
  }
}

/** An env key wins, so `GEMINI_API_KEY=… npm run dev` still overrides whatever the UI stored. */
function resolveKey(): { key: string; from: 'env' | 'stored' } | null {
  const env = process.env.GEMINI_API_KEY
  if (env) return { key: env, from: 'env' }
  const stored = storedKey()
  return stored ? { key: stored, from: 'stored' } : null
}

/**
 * Authenticates a key without spending quota — listing models is free, so a typo is caught before
 * anything reaches disk. Failures come back as codes the page can branch on.
 */
async function verifyKey(key: string): Promise<void> {
  try {
    await new GoogleGenAI({ apiKey: key }).models.list()
  } catch (e) {
    // 400 is what an unparseable key returns; 401/403 is a well-formed key that isn't valid.
    if (e instanceof ApiError && [400, 401, 403].includes(e.status))
      throw new ConveyorError('BAD_KEY', 'Google rejected that key.')
    throw new ConveyorError('VERIFY_FAILED', e instanceof Error ? e.message : String(e))
  }
}

// ================================================================
// TOKEN SOURCES
// ================================================================

// A canned "assistant" reply, streamed token-by-token to mimic an LLM response.
const REPLY =
  'Conveyor streams this back to you one token at a time over a single typed channel, the exact ' +
  'pattern an LLM app needs. The handler is an async generator; each yield is pushed to the ' +
  'renderer as it happens, and stopping the stream aborts it through the signal.\n\n' +
  'Paste a free Gemini API key above and this exact channel streams from a real model instead.'

async function* cannedTokens(input: string, signal: AbortSignal) {
  const text = `You said: “${input.trim() || '…'}”.\n\n${REPLY}`
  for (const token of text.split(/(\s+)/)) {
    if (signal.aborted) return
    yield token
    await new Promise((resolve) => setTimeout(resolve, 45))
  }
}

async function* modelTokens(key: string, input: string, signal: AbortSignal) {
  const ai = new GoogleGenAI({ apiKey: key })
  const chunks = await ai.models.generateContentStream({
    model: MODEL,
    contents: input,
    config: {
      maxOutputTokens: 1024, // deliberately short: this is a demo chat, not a workhorse
      systemInstruction:
        'You are the streaming demo inside an Electron starter kit playground. ' +
        'Answer in a few short sentences, plain text only.',
      // 2.5-flash thinks by default, and thinking tokens aren't streamed — the demo would sit dead
      // for a second before the first word. Off means text starts arriving immediately.
      thinkingConfig: { thinkingBudget: 0 },
      // Client-side only: it stops us reading, it does not stop Google generating.
      abortSignal: signal,
    },
  })
  for await (const chunk of chunks) {
    if (signal.aborted) return
    if (chunk.text) yield chunk.text
  }
}

// ================================================================
// MODULE
// ================================================================

/**
 * Streaming demo — an LLM-style token stream over one typed channel. With a key present, `respond`
 * streams a real gemini-2.5-flash reply; otherwise it streams a canned one. Either way the renderer
 * consumes it with `for await`, and cancelling aborts via the handler's `signal`.
 */
export const streamModule = defineModule({
  /** Which mode the demo is in, so the page can label itself honestly. Never returns the key. */
  source: query(() => {
    const resolved = resolveKey()
    return {
      live: resolved !== null,
      model: resolved ? MODEL : null,
      from: resolved?.from ?? null,
      canStore: safeStorage.isEncryptionAvailable(),
    }
  }),

  /** Verifies a pasted key, then seals it under userData. Throws BAD_KEY rather than storing junk. */
  saveKey: command(z.string().trim().min(1), async ({ input }) => {
    if (!safeStorage.isEncryptionAvailable())
      throw new ConveyorError('NO_KEYCHAIN', 'This system has no keychain available to seal the key.')
    await verifyKey(input)
    writeFileSync(keyFile(), safeStorage.encryptString(input), { mode: 0o600 })
  }),

  /** Forgets the stored key. An env key is not ours to clear, so live mode may survive this. */
  clearKey: command(() => {
    rmSync(keyFile(), { force: true })
  }),

  respond: stream(z.string(), async function* ({ input, signal }) {
    // Resolved per call, not at import: the key can arrive while the app is running.
    const resolved = resolveKey()
    yield* resolved ? modelTokens(resolved.key, input, signal) : cannedTokens(input, signal)
  }),
})
