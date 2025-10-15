const isIE = (): boolean =>
  typeof document !== 'undefined' && 'documentMode' in document

export default isIE
