import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import css from 'rollup-plugin-import-css'
import json from '@rollup/plugin-json'

const PACKAGE_JSON = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
)

const jsExtensions = ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json', '.node']

export const ROLLUP_CONFIG = {
  input: 'src/index.tsx',
  output: [
    {
      file: 'dist/index.mjs',
      format: 'esm',
    },
  ],
  external: [
    ...Object.keys(PACKAGE_JSON.dependencies || {}),
    ...Object.keys(PACKAGE_JSON.devDependencies || {}),
  ],
  plugins: [
    json(),
    babel({
      babelrc: true,
      exclude: 'node_modules/**',
      extensions: jsExtensions,
      babelHelpers: 'bundled',
    }),
    //
    // Babel does not emit declarations
    // https://github.com/babel/babel/issues/9850
    //
    typescript({
      declaration: true,
      declarationDir: 'dist',
    }),
    // commonjs(),
    nodeResolve({
      browser: true,
      extensions: jsExtensions,
    }),
    css({
      output: 'styles.css',
    }),
  ],
}

export async function rollupConfig(config = {}) {
  return typeof config === 'function'
    ? config(ROLLUP_CONFIG)
    : {
        ...ROLLUP_CONFIG,
        ...config,
      }
}
