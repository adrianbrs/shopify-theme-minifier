import EventEmitter from 'events'

export interface MinifierResult {
  on(event: 'data', cb: (filepath: string, content: string) => void): this
  on(event: 'end', cb: () => void): this
}

export class MinifierResult extends EventEmitter {
  private _closed = false

  get closed(): boolean {
    return this._closed
  }

  send(filepath: string, content: string): void {
    if (this.closed) {
      throw new Error('Minifier result stream is closed')
    }
    this.emit('data', filepath, content)
  }

  end(): void {
    if (!this.closed) {
      this._closed = true
      this.emit('end')
      super.removeAllListeners()
    }
  }
}
