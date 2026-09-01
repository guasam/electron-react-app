import { z } from 'zod'
import { defineModule, stream } from '../init'

// A canned "assistant" reply, streamed token-by-token to mimic an LLM response.
const REPLY =
  'Conveyor streams this back to you one token at a time over a single typed channel, the exact ' +
  'pattern an LLM app needs. The handler is an async generator; each yield is pushed to the ' +
  'renderer as it happens, and stopping the stream aborts it through the signal.'

/**
 * Streaming demo — a typewriter/LLM-style token stream. `stream()` yields words with a small delay;
 * the renderer consumes them with `for await`, and cancelling aborts via the handler's `signal`.
 */
export const streamModule = defineModule({
  respond: stream(z.string(), async function* ({ input, signal }) {
    const text = `You said: “${input.trim() || '…'}”.\n\n${REPLY}`
    for (const token of text.split(/(\s+)/)) {
      if (signal.aborted) return
      yield token
      await new Promise((resolve) => setTimeout(resolve, 45))
    }
  }),
})
