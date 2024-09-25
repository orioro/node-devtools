import { rollupConfig } from '@orioro/dev/ts'

export default rollupConfig((base) => ({
  ...base,
  plugins: [...base.plugins],
}))
