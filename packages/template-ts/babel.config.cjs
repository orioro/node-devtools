//
// TODO: keep track of babel + jest support for esm and update
// accordingly
// https://stackoverflow.com/questions/61146112/error-while-loading-config-you-appear-to-be-using-a-native-ecmascript-module-c
//
// import { BABEL_PRESET } from '@orioro/dev/ts'

// export default BABEL_PRESET

module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  exclude: 'node_modules/**',
}
