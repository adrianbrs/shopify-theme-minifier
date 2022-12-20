import * as terser from 'terser'
import * as path from 'path'
import * as fs from 'fs'
import * as sourceMapHelper from '../source-map-helper'
import {IActionSettings} from '../interfaces/settings.interface'
import {MinifierOutput, Minifier} from '../minifier'

export default class JSMinifier extends Minifier {
  static TERSER_OPTIONS: terser.MinifyOptions = {
    mangle: false,
    toplevel: false,
    nameCache: {}
  }

  constructor(fileMap: Record<string, string[]>, settings: IActionSettings) {
    super(['js'], fileMap, settings)
  }

  protected async minify(
    filepath: string
  ): Promise<MinifierOutput | MinifierOutput[]> {
    const output: MinifierOutput[] = []
    const filename = path.basename(filepath)

    const source = fs.readFileSync(filepath, 'utf-8')

    const sourceMap = sourceMapHelper.resolveSourceMap(
      source,
      filepath,
      this.settings?.sourceMap
    )

    let sourceMapOptions: terser.SourceMapOptions | boolean = false

    // apply transformation source map
    if (sourceMap.output) {
      sourceMapOptions = {
        includeSources: true,
        content: sourceMap.input,
        filename,
        url: sourceMap.outputFile
          ? path.basename(sourceMap.outputFile)
          : 'inline'
      }
    }

    const result = await terser.minify(source, {
      ...JSMinifier.TERSER_OPTIONS,
      sourceMap: sourceMapOptions
    })

    if (typeof result.code === 'undefined') {
      throw new Error(`Minify output returned undefined code`)
    }

    if (sourceMap.outputFile && result.map) {
      const sourceMapContent =
        typeof result.map === 'string' ? result.map : JSON.stringify(result.map)
      output.push({filepath: sourceMap.outputFile, content: sourceMapContent})
    }

    output.push({filepath, content: result.code})

    return output
  }
}
