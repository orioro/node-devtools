import { basename, dirname, extname, join } from 'node:path'
import { rollupConfig } from './src/ts/index.mjs'

function replaceExtension(relativePath, newExt) {
  const dir = dirname(relativePath) // Get the directory name
  const baseName = basename(relativePath, extname(relativePath)) // Get the base name without the current extension
  return join(dir, `${baseName}${newExt}`) // Join the directory and new file name with new extension
}

function scriptPaths(relativePath) {
  return {
    input: `./src/${relativePath}`,
    output: [
      {
        file: `dist/${replaceExtension(relativePath, '.mjs')}`,
        format: 'esm',
      },
      {
        file: `dist/${replaceExtension(relativePath, '.cjs')}`,
        format: 'cjs',
      },
    ],
  }
}

const scripts = [
  rollupConfig((base) => ({
    ...base,
    ...scriptPaths('index.mjs'),
  })),
  rollupConfig((base) => ({
    ...base,
    ...scriptPaths('react/index.mjs'),
  })),
  rollupConfig((base) => ({
    ...base,
    ...scriptPaths('ts/index.mjs'),
  })),
]

export default Promise.all(scripts)
