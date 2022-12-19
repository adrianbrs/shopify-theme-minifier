import * as core from '@actions/core'
import * as inputHelper from './input-helper'
import * as minifyHelper from './minify-helper'

async function run(): Promise<void> {
  try {
    const settings = await inputHelper.getSettings()
    await minifyHelper.minify(settings)
  } catch (error: any) {
    core.setFailed(`${error?.message ?? error}`)
  }
}

void run()
