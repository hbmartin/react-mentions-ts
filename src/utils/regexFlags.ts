const STATEFUL_REGEX_FLAGS_PATTERN = /[gy]/g

export const stripStatefulRegexFlags = (flags: string): string =>
  flags.replaceAll(STATEFUL_REGEX_FLAGS_PATTERN, '')
