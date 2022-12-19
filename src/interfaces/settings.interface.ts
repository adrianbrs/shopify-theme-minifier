export interface IActionSettings {
  /**
   * The location on disk where the theme root files are placed
   */
  themePath: string

  /**
   * Files to be ignored (in glob format)
   */
  ignore: string[]

  /**
   * Files to be included (in glob format)
   */
  include: string[]

  /**
   * The location on disk where the minified source files should be placed
   */
  outDir: string

  /**
   * Output minified contents to the console without writing any files
   */
  dryRun: boolean

  /**
   * Controls source map generation
   */
  sourceMap?: boolean | 'none' | 'inline' | 'file'
}
