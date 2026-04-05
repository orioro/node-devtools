import { rollupConfig } from '@orioro/dev/ts'

export default Promise.all([
  rollupConfig((base) => ({
    ...base,
    plugins: [...base.plugins],
  })),

  rollupConfig((base) => ({
    ...base,
    input: 'src/cli.ts',
    // CLI entry has no exports (side-effects only), so treeshaking
    // would incorrectly remove all code. Disabled intentionally.
    treeshake: {
      moduleSideEffects: false,
    },
    output: [
      {
        file: 'dist/cli.mjs',
        format: 'esm',
      },
    ],
  })),
])
