import type { CSSProperties } from 'react'

const mergeStyles = (...styles: Array<CSSProperties | undefined>): CSSProperties | undefined => {
  let merged: CSSProperties | undefined

  for (const style of styles) {
    if (style === undefined) {
      continue
    }

    merged = merged === undefined ? style : { ...merged, ...style }
  }

  return merged
}

export default mergeStyles
