import EventEmitter from 'events'
import {IActionSettings} from './interfaces/settings.interface'

export type MinifierOutput = {
  filepath: string
  content: string
}

export type MinifierResult = MinifierOutput[]

export interface MinifierRunner {
  on(event: 'data', cb: (entry: MinifierOutput) => void): this
  on(event: 'done', cb: (output: MinifierResult) => void): this
}

interface PullItem {
  resolve: (
    iteratorResult: IteratorResult<MinifierOutput, MinifierResult>
  ) => void
  reject: (err: any) => void
}

export abstract class MinifierRunner
  extends EventEmitter
  implements
    AsyncIterable<MinifierOutput>,
    AsyncIterator<MinifierOutput, MinifierResult>
{
  private _closed = false
  private _pullQueue: PullItem[] = []
  private _pushQueue: MinifierOutput[] = []
  private _result: MinifierResult = []
  private _files: readonly string[] = []

  get closed(): boolean {
    return this._closed
  }

  get files(): readonly string[] {
    return this._files
  }

  constructor(
    readonly ext: string[],
    protected fileMap: Record<string, string[]>,
    protected settings: IActionSettings
  ) {
    super()
    this._files = this.ext.flatMap(e => [...fileMap[e]])
  }

  protected abstract minify(
    filepath: string
  ): Promise<MinifierOutput | MinifierOutput[]>

  run(): this {
    void (async () => {
      try {
        for (const filepath of this._files) {
          const result = await this.minify(filepath)

          for (const output of ([] as MinifierOutput[]).concat(result)) {
            await this.push(output)
          }
        }

        this.close()
      } catch (err) {
        await this.throw(err)
      }
    })()

    return this
  }

  async push(output: MinifierOutput): Promise<void> {
    this.emit('data', output)
    this._result.push(output)
    const {resolve} = this._pullQueue.shift() ?? {}
    if (resolve) {
      return resolve({value: output, done: false})
    }

    this._pushQueue.push(output)
  }

  close(): void {
    if (!this._closed) {
      try {
        this._resolve({value: this._result, done: true})
        this.emit('close', this._result)
      } finally {
        this._closed = true
        this._pullQueue = []
        this._pushQueue = []
        this._result = []
      }
    }
  }

  private _resolve(
    value: IteratorResult<MinifierOutput, MinifierResult>
  ): void {
    for (const {resolve} of this._pullQueue) {
      resolve(value)
    }
  }

  private _reject(err: any): void {
    for (const {reject} of this._pullQueue) {
      reject(err)
    }
  }

  async next(): Promise<IteratorResult<MinifierOutput, MinifierResult>> {
    if (this._closed) {
      return this.return()
    }

    return new Promise(async (resolve, reject) => {
      // already have items pushed to the queue
      const value = this._pushQueue.shift()
      if (typeof value !== 'undefined') {
        return resolve({
          value,
          done: false
        })
      }

      // add promise resolution to the pull queue to wait for new pushed items
      this._pullQueue.push({resolve, reject})
    })
  }

  async return(): Promise<IteratorResult<MinifierOutput, MinifierResult>> {
    try {
      this.emit('return')
      return Promise.resolve({
        value: this._result,
        done: true
      })
    } finally {
      this.close()
    }
  }

  async throw(
    error: any
  ): Promise<IteratorResult<MinifierOutput, MinifierResult>> {
    this._reject(error)
    this.close()
    return Promise.reject(error)
  }

  [Symbol.asyncIterator](): AsyncIterator<MinifierOutput, any, undefined> {
    return this
  }
}
