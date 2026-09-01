import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { defineModule, stream, query } from '../init'

// Live mode needs a key in main's environment; without one the canned reply below streams instead,
// so the demo works out of the box and upgrades itself when a key is present.
const MODEL = 'claude-opus-5'
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY)

// A canned "assistant" reply, streamed token-by-token to mimic an LLM response.
const REPLY =
  'Conveyor streams this back to you one token at a time over a single typed channel, the exact ' +
  'pattern an LLM app needs. The handler is an async generator; each yield is pushed to the ' +
  'renderer as it happens, and stopping the stream aborts it through the signal.\n\n' +
  'Set ANTHROPIC_API_KEY before npm run dev and this exact channel streams from a real model instead.'

async function* cannedTokens(input: string, signal: AbortSignal) {
  const text = `You said: “${input.trim() || '…'}”.\n\n${REPLY}`
  for (const token of text.split(/(\s+)/)) {
    if (signal.aborted) return
    yield token
    await new Promise((resolve) => setTimeout(resolve, 45))
  }
}

async function* modelTokens(input: string, signal: AbortSignal) {
  const client = new Anthropic()
  const events = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 1024, // deliberately short: this is a demo chat, not a workhorse
      system:
        'You are the streaming demo inside an Electron template playground. ' +
        'Answer in a few short sentences, plain text only.',
      messages: [{ role: 'user', content: input }],
    },
    { signal }
  )
  for await (const event of events) {
    if (signal.aborted) return
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text
  }
}

/**
 * Streaming demo — an LLM-style token stream over one typed channel. With ANTHROPIC_API_KEY set,
 * `respond` streams a real claude-opus-5 reply; otherwise it streams a canned one. Either way the
 * renderer consumes it with `for await`, and cancelling aborts via the handler's `signal`.
 */
export const streamModule = defineModule({
  /** Which mode the demo is in, so the page can label itself honestly. */
  source: query(() => ({ live: hasKey, model: hasKey ? MODEL : null })),

  respond: stream(z.string(), async function* ({ input, signal }) {
    yield* hasKey ? modelTokens(input, signal) : cannedTokens(input, signal)
  }),
})
