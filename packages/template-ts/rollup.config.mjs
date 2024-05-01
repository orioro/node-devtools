import { rollupConfig } from '@orioro/dev/ts/rollup.mjs'

export default rollupConfig((base) => ({
  ...base,
  plugins: [...base.plugins],
}))
