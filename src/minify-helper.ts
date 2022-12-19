import {IActionSettings} from './interfaces/settings.interface'
import * as fsHelper from './fs-helper'
import * as core from '@actions/core'
import * as minifierLoaders from './minifiers'
import {MinifierResult} from './minifier'

export async function minify(settings: IActionSettings): Promise<void> {
  const {themePath, include, ignore} = settings

  if (!include.length) {
    include.push(
      './assets/*.+(js|css|liquid)',
      './layout/*.liquid',
      './sections/*.liquid',
      './snippets/*.liquid',
      './template/*.liquid'
    )
  }

  const fileMap = fsHelper.loadThemeFiles(themePath, include, ignore)
  const minifiers = minifierLoaders.load(fileMap, settings)
  const result: MinifierResult = []

  for (const minifier of minifiers) {
    const extNames = minifier.ext.join(', ')

    try {
      core.startGroup(`Minify (${extNames})`)
      core.info(`Starting minification of ${minifier.files.length} files...`)

      const startTime = performance.now()
      let lastTime = startTime
      for await (const output of minifier.run()) {
        result.push(output)

        const endTime = performance.now()
        const fromPath = fsHelper.getWorkspaceRelative(output.filepath)
        const time = lastTime - endTime
        core.debug(`Minified ${fromPath} (~${time.toFixed(0)}ms)`)
        lastTime = endTime
      }

      core.info(`Done! (~${(performance.now() - startTime).toFixed(0)}ms)`)

      core.endGroup()
    } catch (err: any) {
      core.error(err)
      throw new Error(
        `Could not minify (${extNames}) files: ${err?.message || err}`
      )
    }
  }

  core.startGroup(`Writing output of ${result.length} files...`)

  for (const {filepath, content} of result) {
    const outputFile = fsHelper.getOutputFile(settings, filepath)
    if (settings.dryRun) {
      core.startGroup(outputFile)
      core.info(content)
      core.endGroup()
    } else {
      const fromFile = fsHelper.getWorkspaceRelative(filepath)
      const toFile = fsHelper.getWorkspaceRelative(outputFile)
      core.debug(`Writing ${fromFile} => ${toFile} ...`)
      fsHelper.writeFileSync(outputFile, content, 'utf-8')
    }
  }

  core.info(`Done! Written ${result.length} files successfully.`)
  core.endGroup()
}
