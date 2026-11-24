export function isAppDocument(candidate: string, entry: string): boolean {
  try {
    const actual = new URL(candidate),
      expected = new URL(entry)
    actual.hash = ''
    expected.hash = ''
    return !actual.username && !actual.password && actual.href === expected.href
  } catch {
    return false
  }
}
export function isAllowedCaller(input: {
  registered: boolean
  topFrame: boolean
  senderUrl: string
  frameUrl: string
  entry: string
}): boolean {
  return (
    input.registered &&
    input.topFrame &&
    isAppDocument(input.senderUrl, input.entry) &&
    isAppDocument(input.frameUrl, input.entry)
  )
}
