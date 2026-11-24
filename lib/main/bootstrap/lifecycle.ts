export class QuitCoordinator {
  private stopping = false
  private finished = false
  get isStopping() {
    return this.stopping
  }
  constructor(
    private readonly stop: () => Promise<void>,
    private readonly quit: () => void,
    private readonly report: (error: unknown) => void = console.error
  ) {}

  beforeQuit(event: { preventDefault(): void }) {
    if (this.finished) return
    event.preventDefault()
    if (this.stopping) return
    this.stopping = true
    void this.stop()
      .catch(this.report)
      .finally(() => {
        this.finished = true
        this.quit()
      })
  }
}
