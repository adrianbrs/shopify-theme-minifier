import {IActionSettings} from './interfaces/settings.interface'
import * as path from 'path'
import * as core from '@actions/core'
import * as fsHelper from './fs-helper'

export async function getSettings(): Promise<IActionSettings> {
  const result = {} as unknown as IActionSettings

  // GitHub workspace
  const workspacePath = fsHelper.getGithubWorkspace()
  core.debug(`GITHUB_WORKSPACE = '${workspacePath}'`)
  fsHelper.existsSync(workspacePath, true, true)

  // Theme path
  result.themePath = getWorkspacePath(
    'Theme',
    workspacePath,
    core.getInput('themePath')
  )
  fsHelper.existsSync(result.themePath, true, true)

  // Ignore
  result.ignore = core.getMultilineInput('ignore')

  // Include
  result.include = core.getMultilineInput('include')

  // Out dir
  result.outDir = getWorkspacePath(
    'Out dir',
    workspacePath,
    core.getInput('outDir') || result.themePath
  )

  // Dry run
  result.dryRun = core.getBooleanInput('dryRun')

  // Source map
  const sourceMap = core.getInput('sourceMap').toLowerCase()
  if (sourceMap) {
    const sourceMapValues = ['true', 'false', 'none', 'inline', 'file']
    if (!sourceMapValues.includes(sourceMap)) {
      throw new Error(
        `Invalid sourceMap option '${sourceMap}', valid options are: ${sourceMapValues.join(
          ', '
        )}`
      )
    }
    result.sourceMap = getBooleanOrDefault(sourceMap)
  }

  return result
}

function getBooleanOrDefault<T = string>(
  value: string,
  defaultValue: T = value as T
): boolean | T {
  value = value.toLowerCase().trim()
  return value === 'true' ? true : value === 'false' ? false : defaultValue
}

function getWorkspacePath(
  name: string,
  githubWorkspacePath: string,
  targetPath?: string | null
): string {
  let resultPath = targetPath || '.'
  resultPath = path.resolve(githubWorkspacePath, resultPath)
  if (!(resultPath + path.sep).startsWith(githubWorkspacePath + path.sep)) {
    throw new Error(
      `${name} path '${resultPath}' is not under '${githubWorkspacePath}'`
    )
  }
  return resultPath
}
