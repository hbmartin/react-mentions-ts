import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// eslint-disable-next-line code-complete/enforce-meaningful-names
export default function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}
