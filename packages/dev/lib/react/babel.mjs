export const BABEL_PRESET = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
  exclude: 'node_modules/**',
}

export function babelConfig(config = {}) {
  return {
    ...BABEL_PRESET,
    ...config,
  }
}
