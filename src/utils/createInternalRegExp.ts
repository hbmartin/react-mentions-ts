const VALID_REGEXP_FLAGS = /^[dgimsuvy]*$/

const createInternalRegExp = (source: string, flags = ''): RegExp => {
  if (!VALID_REGEXP_FLAGS.test(flags)) {
    throw new Error(`Invalid RegExp flags: ${flags}`)
  }

  // The callers build `source` from escaped internal templates. Centralizing the
  // constructor keeps the security exception documented in one place.
  /* eslint-disable-next-line security/detect-non-literal-regexp */
  return new RegExp(source, flags)
}

export default createInternalRegExp
