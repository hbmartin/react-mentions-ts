import React from 'react'
import useStyles from 'substyle'

/**
 * TODO: convert to interface/ty[e when TS is available

Mention.propTypes = {
  onAdd: PropTypes.func,
  onRemove: PropTypes.func,

  renderSuggestion: PropTypes.func,

  trigger: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(RegExp),
  ]),
  markup: PropTypes.string,
  displayTransform: PropTypes.func,
  allowSpaceInQuery: PropTypes.bool,

  isLoading: PropTypes.bool,
}
*/


export const DEFAULT_MENTION_PROPS = {
  trigger: '@',
  markup: '@[__display__](__id__)',
  onAdd: () => null,
  onRemove: () => null,
  displayTransform: (id, display) => display || id,
  renderSuggestion: null,
  isLoading: false,
  appendSpaceOnAdd: false,
}

const defaultStyle = {
  fontWeight: 'inherit',
}

export default function Mention({
  display,
  style,
  className,
  classNames,
  trigger = DEFAULT_MENTION_PROPS.trigger,
  markup = DEFAULT_MENTION_PROPS.markup,
  displayTransform = DEFAULT_MENTION_PROPS.displayTransform,
  onAdd = DEFAULT_MENTION_PROPS.onAdd,
  onRemove = DEFAULT_MENTION_PROPS.onRemove,
  renderSuggestion = DEFAULT_MENTION_PROPS.renderSuggestion,
  isLoading = DEFAULT_MENTION_PROPS.isLoading,
  appendSpaceOnAdd = DEFAULT_MENTION_PROPS.appendSpaceOnAdd,
}) {
  const styles = useStyles(defaultStyle, { style, className, classNames })

  return <strong {...styles}>{display}</strong>
}
