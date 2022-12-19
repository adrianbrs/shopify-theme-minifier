import {IActionSettings} from '../interfaces/settings.interface'
import {Minifier} from '../minifier'
import CSS from './css.minifier'
import JS from './js.minifier'

export function load(
  fileMap: Record<string, string[]>,
  settings: IActionSettings
): Minifier[] {
  return [CSS, JS].map(Minifier => new Minifier(fileMap, settings))
}
