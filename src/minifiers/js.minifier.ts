import * as babel from '@babel/core'
import * as UglifyJS from 'uglify-js'
import * as path from 'path'
import * as fs from 'fs'
import * as fsHelper from '../fs-helper'
import * as sourceMapHelper from '../source-map-helper'
import {IActionSettings} from '../interfaces/settings.interface'
import {MinifierOutput, MinifierRunner} from '../minifier'
import {SourceMapConsumer, SourceMapGenerator} from 'source-map'

export default class MinifierJS extends MinifierRunner {
  private _sharedOptions: UglifyJS.MinifyOptions = {
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

    // Process with babel to increase compatibility
    const transformOptions: babel.TransformOptions = {
      presets: ['@babel/preset-env'],
      ast: false,
      filename
    }

    // Apply original file sourcemap
    if (sourceMap.output) {
      transformOptions.sourceMaps = true

      if (sourceMap.input) {
        const sourceMapConsumer = await new SourceMapConsumer(sourceMap.input)
        const sourceMapGenerator =
          SourceMapGenerator.fromSourceMap(sourceMapConsumer)
        transformOptions.inputSourceMap = sourceMapGenerator.toJSON()
      }
    }

    const babelResult = await babel.transformAsync(source, transformOptions)

    if (!babelResult?.code) {
      throw new Error(
        `Could not transform source file with babel: ${fsHelper.getWorkspaceRelative(
          filepath
        )}`
      )
    }

    let sourceMapOptions: UglifyJS.SourceMapOptions | boolean = false

    // apply transformation source map
    if (babelResult.map) {
      sourceMapOptions = {
        includeSources: true,
        content: babelResult.map as any,
        filename,
        url: sourceMap.outputFile
          ? path.basename(sourceMap.outputFile)
          : 'inline'
      }
    }

    const result = UglifyJS.minify(source, {
      ...this._sharedOptions,
      sourceMap: sourceMapOptions
    })

    if (result.error) {
      throw result.error
    }

    if (sourceMap.outputFile && result.map) {
      output.push({filepath: sourceMap.outputFile, content: result.map})
    }

    output.push({filepath, content: result.code})

    return output
  }
}
