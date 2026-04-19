import MentionsInputBase from '../MentionsInputBase'
import coreStyles from '../styles/core'

export default class MentionsInput<
  Extra extends Record<string, unknown> = Record<string, unknown>,
> extends MentionsInputBase<Extra> {
  protected readonly styles = coreStyles
}
