//
// Use babel.config.cjs (not .js or .mjs) in the consuming package.
// Jest requires CommonJS config files to correctly apply Babel transforms.
//
import presetEnv from '@babel/preset-env'
import presetTypescript from '@babel/preset-typescript'
import presetReact from '@babel/preset-react'

export const BABEL_PRESET = {
  presets: [presetEnv, presetTypescript, presetReact],
  exclude: 'node_modules/**',
}

export function babelConfig(config = {}) {
  return {
    ...BABEL_PRESET,
    ...config,
  }
}
