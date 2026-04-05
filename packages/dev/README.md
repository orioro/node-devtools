# @orioro/dev

Shared dev tooling configuration. Centralizes Rollup, Babel, and Storybook configs so build tooling can be updated in one place instead of package by package.

## Exports

| Import path | Use case |
|---|---|
| `@orioro/dev/ts` | TypeScript-only libraries |
| `@orioro/dev/react` | React + TypeScript libraries |
| `@orioro/dev` | Both namespaces as `{ REACT, TS }` |

---

## Setup

### 1. Babel — `babel.config.cjs`

Create a `babel.config.cjs` (not `.js` or `.mjs`) in the consuming package root. Jest requires a CommonJS config file to correctly apply Babel transforms.

**TypeScript package:**
```js
// babel.config.cjs
const { babelConfig } = require('@orioro/dev/ts')
module.exports = babelConfig()
```

**React package:**
```js
// babel.config.cjs
const { babelConfig } = require('@orioro/dev/react')
module.exports = babelConfig()
```

This file is the single source of truth for Babel — both Rollup (via `babelrc: true`) and Jest pick it up automatically. Avoid configuring Babel presets or plugins elsewhere.

To extend the base config:
```js
const { babelConfig } = require('@orioro/dev/ts')
module.exports = babelConfig({
  plugins: ['my-extra-plugin'],
})
```

---

### 2. Rollup — `rollup.config.mjs`

**TypeScript package:**
```js
// rollup.config.mjs
import { rollupConfig } from '@orioro/dev/ts'
export default rollupConfig()
```

**React package:**
```js
// rollup.config.mjs
import { rollupConfig } from '@orioro/dev/react'
export default rollupConfig()
```

The config automatically externalizes everything listed in `dependencies` and `devDependencies` from the package's own `package.json`.

To customize, pass a function that receives the base config:
```js
export default rollupConfig((base) => ({
  ...base,
  input: 'src/custom-entry.tsx',
}))
```

#### What the Rollup config does

| Plugin | Role |
|---|---|
| `@rollup/plugin-babel` | Transpiles code — defers to `babel.config.cjs` |
| `@rollup/plugin-typescript` | Emits `.d.ts` declaration files only (Babel cannot do this) |
| `@rollup/plugin-node-resolve` | Resolves `node_modules` imports |
| `@rollup/plugin-commonjs` | CJS interop (TS only) |
| `rollup-plugin-import-css` | Bundles CSS into `dist/styles.css` (React only) |
| `@rollup/plugin-json` | Allows importing `.json` files (React only) |

**Default outputs:**

- `ts`: `dist/index.js` (CJS) + `dist/index.mjs` (ESM)
- `react`: `dist/index.mjs` (ESM only)

---

### 3. Storybook — `.storybook/main.cjs`

```js
// .storybook/main.cjs
const { STORYBOOK_MAIN } = require('@orioro/dev/react')
module.exports = STORYBOOK_MAIN
```

Or to extend:
```js
const { STORYBOOK_MAIN } = require('@orioro/dev/react')
module.exports = {
  ...STORYBOOK_MAIN,
  stories: ['../src/**/*.stories.tsx'],
}
```

The base config targets `@storybook/nextjs` and includes the `links`, `essentials`, and `interactions` addons.
