import * as csso from 'csso'
import * as fs from 'fs'
import * as path from 'path'
import * as sourceMapHelper from '../source-map-helper'
import {SourceMapConsumer, SourceMapGenerator} from 'source-map'
import {IActionSettings} from '../interfaces/settings.interface'
import {MinifierOutput, Minifier} from '../minifier'

export default class MinifierCSS extends Minifier {
  constructor(fileMap: Record<string, string[]>, settings: IActionSettings) {
    super(['css'], fileMap, settings)
  }

  protected async minify(filepath: string): Promise<MinifierOutput[]> {
    const output: MinifierOutput[] = []
    const source = fs.readFileSync(filepath, 'utf-8')
    const filename = path.basename(filepath)
    const sourceMap = sourceMapHelper.resolveSourceMap(
      source,
      filepath,
      this.settings?.sourceMap
    )
    const result = csso.minify(source, {
      filename,
      sourceMap: sourceMap.output
    }) as csso.Result & {map: SourceMapGenerator | null}

    if (sourceMap.output && result.map) {
      let sourceMapURL: string | null = null

      // apply input map
      if (sourceMap.input) {
        result.map.applySourceMap(
          await new SourceMapConsumer(sourceMap.input),
          filename
        )
      }

      // add source map to result
      if (sourceMap.outputFile) {
        // write source map to file
        output.push({
          filepath: sourceMap.outputFile,
          content: result.map.toString()
        })
        sourceMapURL = path.basename(sourceMap.outputFile)
      } else {
        sourceMapURL = `data:application/json;base64,${Buffer.from(
          result.map.toString()
        ).toString('base64')}`
      }

      result.css += `\n/*# sourceMappingURL=${sourceMapURL} */`
    }

    output.push({filepath, content: result.css})

    return output
  }
}
