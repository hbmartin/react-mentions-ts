import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { ClassNameValue } from './types'

const tailwindMergeClassNames = (...classNames: ClassNameValue[]): string =>
  twMerge(clsx(...(classNames as ClassValue[])))

export default tailwindMergeClassNames
