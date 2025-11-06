// escape RegExp special characters https://stackoverflow.com/a/9310752/5142490
// eslint-disable-next-line code-complete/enforce-meaningful-names
const escapeRegex = (str: string): string => str.replaceAll(/[\s#$()*+,.?[\\\]^{|}-]/g, '\\$&')

export default escapeRegex
