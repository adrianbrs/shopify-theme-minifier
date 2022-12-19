import * as fs from 'fs'
import * as glob from 'glob'
import path from 'path'
import {IActionSettings} from './interfaces/settings.interface'

export function existsSync(
  targetPath: string,
  required?: boolean,
  dir?: boolean
): boolean {
  if (!targetPath) {
    throw new Error("Arg 'path' must not be empty")
  }

  let stats: fs.Stats
  try {
    stats = fs.statSync(targetPath)
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      if (!required) {
        return false
      }

      throw new Error(
        `${dir ? 'Directory' : 'File'} '${targetPath}' does not exist`
      )
    }

    throw new Error(
      `Encountered an error when checking whether path '${targetPath}' exists: ${
        error?.message ?? error
      }`
    )
  }

  if (!!dir === !!stats.isDirectory()) {
    return true
  }
  return false
}

export function writeFileSync(
  filepath: string,
  content: string,
  options?: fs.WriteFileOptions
): void {
  ensureDirSync(path.dirname(filepath))
  fs.writeFileSync(filepath, content, options)
}

export function ensureDirSync(dir: string): void {
  let isDirectory = false
  try {
    const stats = fs.statSync(dir)
    isDirectory = stats.isDirectory()
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      fs.mkdirSync(dir, {
        recursive: true
      })
      isDirectory = true
    } else {
      throw new Error(
        `Encountered an error when checking whether path '${dir}' exists: ${
          error?.message ?? error
        }`
      )
    }
  }

  if (!isDirectory) {
    throw new Error(`The path '${dir}' must be a directory`)
  }
}

export function getGithubWorkspace(): string {
  const workspacePath = process.env['GITHUB_WORKSPACE']
  if (!workspacePath) {
    throw new Error('GITHUB_WORKSPACE not defined')
  }
  return path.resolve(workspacePath)
}

export function loadThemeFiles(
  cwd: string,
  include: string[],
  ignore: string[]
): Record<string, string[]> {
  const files = include
    .map(pattern =>
      glob.sync(pattern, {
        cwd,
        nodir: true,
        ignore,
        absolute: true
      })
    )
    .flat()

  return files.reduce((result, file) => {
    // Ensure file is inside cwd
    if (!isUnderPath(file, cwd)) {
      throw new Error(
        `Theme files must be inside theme path: ${path.relative(cwd, file)}`
      )
    }

    const ext = path.extname(file).substring(1)
    if (ext) {
      result[ext] = (result[ext] ?? []).concat(file)
    }
    return result
  }, {} as Record<string, string[]>)
}

export function isUnderPath(childPath: string, parentPath: string): boolean {
  return (childPath + path.sep).startsWith(parentPath + path.sep)
}

export function getOutputFile(
  settings: IActionSettings,
  filepath: string
): string {
  const relativePath = path.relative(settings.themePath, filepath)
  if (!isUnderPath(filepath, settings.themePath)) {
    throw new Error(`File must be under theme path: ${relativePath}`)
  }
  return path.resolve(settings.outDir, relativePath)
}

export function getWorkspaceRelative(filepath: string): string {
  return path.relative(getGithubWorkspace(), filepath)
}
