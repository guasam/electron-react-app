import { describe, expect, it } from 'vitest'
import { isAppDocument, isAllowedCaller } from '../../lib/main/sender-policy'
describe('sender document policy', () => {
  it('accepts view hashes but rejects other paths, ports, protocols, and credentials', () => {
    const entry = 'http://localhost:5173/'
    expect(isAppDocument(`${entry}#settings`, entry)).toBe(true)
    for (const candidate of [
      'http://localhost:5174/',
      'http://localhost:5173/other',
      'https://localhost:5173/',
      'http://user:password@localhost:5173/',
      'file:///app/index.html',
    ])
      expect(isAppDocument(candidate, entry)).toBe(false)
    expect(isAppDocument('app://starter/index.html#settings', 'app://starter/index.html')).toBe(true)
    expect(isAppDocument('app://evil/index.html', 'app://starter/index.html')).toBe(false)
  })
  it('requires a registered, current top-level app frame', () => {
    const valid = {
      registered: true,
      topFrame: true,
      senderUrl: 'app://starter/index.html',
      frameUrl: 'app://starter/index.html',
      entry: 'app://starter/index.html',
    }
    expect(isAllowedCaller(valid)).toBe(true)
    expect(isAllowedCaller({ ...valid, registered: false })).toBe(false)
    expect(isAllowedCaller({ ...valid, topFrame: false })).toBe(false)
    expect(isAllowedCaller({ ...valid, senderUrl: 'https://example.com/' })).toBe(false)
  })
})
