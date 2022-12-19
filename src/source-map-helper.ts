import * as path from 'path'
import * as fs from 'fs'
import * as fsHelper from './fs-helper'

export interface IResolvedSourceMap {
  input?: string
  output: boolean
  outputFile?: string
}

export function resolveSourceMap(
  source: string,
  filepath: string,
  type?: boolean | 'none' | 'inline' | 'file'
): IResolvedSourceMap {
  const result = {
    output: type && type !== 'none'
  } as IResolvedSourceMap

  if (!result.output) {
    return result
  }

  let inputFile: string | undefined

  if (type === 'file') {
    result.outputFile = `${filepath}.map`
  }

  // try fetch source map from source
  const [, inputMapComment] =
    source.match(/\/\*# sourceMappingURL=(\S+)\s*\*\/\s*$/) || []

  // if comment found – value is filename or base64-encoded source map
  if (inputMapComment) {
    if (inputMapComment.startsWith('data:')) {
      // decode source map content from comment
      result.input = Buffer.from(
        inputMapComment.substring(inputMapComment.indexOf('base64,') + 7),
        'base64'
      ).toString()
    } else {
      // value is filename – resolve it as absolute path
      inputFile = path.resolve(path.dirname(filepath), inputMapComment)
    }
  } else {
    // comment doesn't found - look up file with `.map` extension nearby input file
    if (fsHelper.existsSync(`${filepath}.map`, false)) {
      inputFile = `${filepath}.map`
    }
  }

  // source map placed in external file
  if (inputFile) {
    result.input = fs.readFileSync(inputFile, 'utf8')
  } else if (result.input) {
    inputFile = '<inline>'
  }

  return result
}
