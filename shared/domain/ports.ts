export interface Clock {
  now(): string
}
export interface IdGenerator {
  next(): string
}
