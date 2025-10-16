import { useMemo } from 'react'
import clsx from 'clsx'
import type { CSSProperties } from 'react'

export type StyleOverride = Record<string, CSSProperties | StyleOverride>
export type ClassNamesProp = Record<string, string>

export interface StyleProps {
  style?: CSSProperties
  className?: string
}

export type Modifiers = Record<string, boolean> | string[]

export interface SubstyleFunction extends StyleProps {
  (key?: string | string[], modifiers?: Modifiers): SubstyleFunction
}

export interface StyleOptions {
  style?: StyleOverride | SubstyleFunction
  className?: string
  classNames?: ClassNamesProp
}

function mergeStyles(
  baseStyle: CSSProperties | undefined,
  overrideStyle: CSSProperties | undefined
): CSSProperties | undefined {
  if (!baseStyle && !overrideStyle) return undefined
  if (!overrideStyle) return baseStyle
  if (!baseStyle) return overrideStyle
  return { ...baseStyle, ...overrideStyle }
}

function getNestedStyle(
  styles: Record<string, any>,
  keys: string | string[]
): CSSProperties | undefined {
  const keyArray = Array.isArray(keys) ? keys : [keys]
  let result: CSSProperties | undefined

  for (const key of keyArray) {
    const value = styles[key]
    if (value && typeof value === 'object') {
      result = mergeStyles(result, value as CSSProperties)
    }
  }

  return result
}

function getNestedClassName(classNames: ClassNamesProp | undefined, keys: string | string[]): string | undefined {
  if (!classNames) return undefined
  const keyArray = Array.isArray(keys) ? keys : [keys]
  const classes = keyArray.map(key => classNames[key]).filter(Boolean)
  return classes.length > 0 ? classes.join(' ') : undefined
}

function applyModifiers(
  baseClassName: string | undefined,
  modifiers: Modifiers | undefined
): string | undefined {
  if (!modifiers) return baseClassName

  const modifierClasses = Array.isArray(modifiers)
    ? modifiers.map(mod => mod.replace(/^&/, ''))
    : Object.entries(modifiers)
        .filter(([, value]) => value)
        .map(([key]) => key.replace(/^&/, ''))

  return clsx(baseClassName, modifierClasses)
}

function getScopedObject(obj: Record<string, any> | undefined, keys: string | string[]): Record<string, any> {
  if (!obj) return {}
  const keyArray = Array.isArray(keys) ? keys : [keys]
  let result: Record<string, any> = {}

  for (const key of keyArray) {
    const value = obj[key]
    if (value && typeof value === 'object') {
      result = { ...result, ...value }
    }
  }

  return result
}

function createSubstyleFunction(
  style: CSSProperties | undefined,
  className: string | undefined,
  defaultStyle: Record<string, any>,
  styleOverride: StyleOverride | undefined,
  classNamesOverride: ClassNamesProp | undefined,
  baseClassName?: string  // For BEM support
): SubstyleFunction {
  const substyleFunction = (key?: string | string[], keyModifiers?: Modifiers): SubstyleFunction => {
    if (!key) {
      return createSubstyleFunction(style, className, defaultStyle, styleOverride, classNamesOverride, baseClassName)
    }

    const defaultNestedStyle = getNestedStyle(defaultStyle, key)
    const overrideNestedStyle = styleOverride ? getNestedStyle(styleOverride, key) : undefined
    const mergedStyle = mergeStyles(defaultNestedStyle, overrideNestedStyle)

    const nestedClassName = getNestedClassName(classNamesOverride, key)

    // BEM naming: If there's a base className and we're accessing a nested element,
    // generate className like "baseClass__elementName"
    const bemClassName = baseClassName && typeof key === 'string'
      ? `${baseClassName}__${key}`
      : undefined

    const combinedClassName = clsx(bemClassName, nestedClassName)
    const finalClassName = applyModifiers(combinedClassName, keyModifiers)

    // Scope the defaultStyle and styleOverride to the nested key
    const scopedDefaultStyle = getScopedObject(defaultStyle, key)
    const scopedStyleOverride = styleOverride ? getScopedObject(styleOverride, key) : undefined

    return createSubstyleFunction(
      mergedStyle,
      finalClassName,
      scopedDefaultStyle,
      scopedStyleOverride,
      classNamesOverride,
      baseClassName  // Pass baseClassName down for nested BEM naming
    )
  }

  // Make the function spreadable by adding style and className properties
  substyleFunction.style = style
  substyleFunction.className = className

  return substyleFunction as SubstyleFunction
}

function isCSSProperty(key: string): boolean {
  // Check if a key is a CSS property or a nested element key
  // CSS properties typically start with lowercase or are camelCase properties
  // Nested elements are typically named keys like 'item', 'list', etc.
  // '&' is a special key for the current element
  if (key === '&') return false

  // Common CSS properties start with common prefixes or are known properties
  const cssPropertyPattern = /^(margin|padding|border|background|color|font|text|display|position|top|left|right|bottom|width|height|min|max|flex|grid|align|justify|overflow|opacity|transform|transition|animation|cursor|pointer|z-?index|box-?|line-?|letter-?|word-?|white-?|outline|visibility|content)/i
  return cssPropertyPattern.test(key) || key.includes('-')
}

function extractRootStyles(styleOverride: StyleOverride | undefined): CSSProperties | undefined {
  if (!styleOverride) return undefined

  const rootStyles: CSSProperties = {}
  let hasStyles = false

  for (const [key, value] of Object.entries(styleOverride)) {
    if (isCSSProperty(key) && typeof value !== 'object') {
      rootStyles[key as keyof CSSProperties] = value as any
      hasStyles = true
    }
  }

  return hasStyles ? rootStyles : undefined
}

export default function useStyles(
  defaultStyle: Record<string, any> = {},
  options: StyleOptions = {},
  modifiers?: Modifiers
): SubstyleFunction {
  const { style: styleOption, className: classNameOverride, classNames: classNamesOverride } = options

  return useMemo(() => {
    // Check if styleOption is a SubstyleFunction (has a callable signature and style/className properties)
    let styleOverride: StyleOverride | undefined
    let inlineStyle: CSSProperties | undefined
    let inlineClassName: string | undefined

    if (typeof styleOption === 'function') {
      // It's a SubstyleFunction, extract its properties
      inlineStyle = (styleOption as SubstyleFunction).style
      inlineClassName = (styleOption as SubstyleFunction).className
      styleOverride = undefined
    } else {
      styleOverride = styleOption
    }

    // Extract root-level CSS properties from styleOverride
    const rootStyleFromOverride = extractRootStyles(styleOverride)
    const rootStyleFromAmpersand = styleOverride?.['&'] as CSSProperties | undefined

    const rootStyle = mergeStyles(
      mergeStyles(
        mergeStyles(defaultStyle as CSSProperties, rootStyleFromOverride),
        rootStyleFromAmpersand
      ),
      inlineStyle
    )

    // Handle classNames with & prefix
    const rootClassNameFromOverride = classNamesOverride?.['&']
    const rootClassName = applyModifiers(
      clsx(classNameOverride, rootClassNameFromOverride, inlineClassName),
      modifiers
    )

    return createSubstyleFunction(
      rootStyle,
      rootClassName,
      defaultStyle,
      styleOverride,
      classNamesOverride,
      classNameOverride  // Pass as baseClassName for BEM naming
    )
  }, [defaultStyle, styleOption, classNameOverride, classNamesOverride, modifiers])
}

export function inline(
  substyle: SubstyleFunction,
  inlineStyle: CSSProperties
): StyleProps {
  const base = substyle()
  return {
    style: mergeStyles(base.style, inlineStyle),
    className: base.className,
  }
}
