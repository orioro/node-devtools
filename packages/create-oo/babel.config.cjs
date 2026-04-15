//
// babel.config.cjs
//
// Must use .cjs extension (instead of .mjs or plain .js) so that Babel config
// is always loaded as CommonJS. Jest calls Babel synchronously, and ESM config
// files are only supported when Babel runs asynchronously — using .cjs avoids
// that conflict regardless of the package's "type" field.
//
// See: https://stackoverflow.com/questions/61146112/error-while-loading-config-you-appear-to-be-using-a-native-ecmascript-module-c
//
// @orioro/dev's BABEL_PRESET provides a base setup of @babel/preset-env +
// @babel/preset-typescript with node_modules excluded.
//
const { BABEL_PRESET } = require('@orioro/dev/ts')

module.exports = {
  ...BABEL_PRESET,
}
