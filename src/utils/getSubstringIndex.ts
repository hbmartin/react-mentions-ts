import lettersDiacritics from './diacritics'

const removeAccents = (str: string): string => {
  let formattedStr = str

  for (const letterDiacritics of lettersDiacritics) {
    formattedStr = formattedStr.replace(letterDiacritics.letters, letterDiacritics.base)
  }

  return formattedStr
}

export const normalizeString = (str: string): string => removeAccents(str).toLowerCase()

const getSubstringIndex = (str: string, substr: string, ignoreAccents?: boolean): number => {
  if (!ignoreAccents) {
    return str.toLowerCase().indexOf(substr.toLowerCase())
  }

  return normalizeString(str).indexOf(normalizeString(substr))
}

export default getSubstringIndex
