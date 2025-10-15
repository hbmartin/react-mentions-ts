import PLACEHOLDERS from './placeholders'

const makeMentionsMarkup = (markup: string, id: string | number, display: string): string => {
  return markup.replace(PLACEHOLDERS.id, String(id)).replace(PLACEHOLDERS.display, display)
}

export default makeMentionsMarkup
