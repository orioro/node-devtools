import { rollupConfig } from './lib/ts/index.mjs'

export default rollupConfig((base) => ({
  ...base,
  input: './lib/index.mjs',
  plugins: [...base.plugins],
}))
