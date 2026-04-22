# @orioro/readme

Scans TypeScript source files for `@public`-tagged functions and generates
markdown API documentation appended to a `.README.md` template.

## Installation

```bash
npm install --save-dev @orioro/readme
# or
yarn add --dev @orioro/readme
```

Add a script to your `package.json`:

```json
{
  "scripts": {
    "readme": "readme"
  }
}
```

Then create a `.README.md` template in your project root with your hand-written
content. Running `npm run readme` (or `yarn readme`) will append the generated
API section to it and write `README.md`.

## Workflow

1. Write your public API functions and annotate them with `@public` in JSDoc
2. Keep a `.README.md` with your intro, examples, and any hand-written content
3. Run `npm run readme` to regenerate `README.md` — commit both files

## JSDoc tags

### `@public`

Marks a function, arrow function, constant, or class for inclusion in the
generated docs. Symbols without this tag are ignored.

```ts
/**
 * Adds two numbers.
 * @public
 */
export function add(a: number, b: number): number {
  return a + b
}
```

### `@name`

Overrides the name used in the docs. Useful when the exported symbol has an
internal name that shouldn't be surfaced.

```ts
/**
 * @public
 * @name createClient
 */
export function _createClientInternal(): Client { ... }
```

### `@example`

Adds a code example. Multiple `@example` tags are supported. To give an example
a title, use `<caption>`:

```ts
/**
 * @public
 * @example <caption>Basic usage</caption>
 * add(1, 2) // => 3
 * @example
 * const result = add(10, 20)
 * console.log(result) // => 30
 */
export function add(a: number, b: number): number { ... }
```

Examples without a `<caption>` are numbered automatically (`Example 1`,
`Example 2`, …).

### `@readme`

Controls rendering options via space-separated `key=value` pairs.

#### `kind`

Overrides the section an entry is grouped under in the rendered output. By
default, functions appear under **Functions**, classes under **Classes**, and
exported constants under **Constants**. Use `kind` to place an entry in a
custom section — the value becomes the section heading.

This is particularly useful for React projects where components should be
documented separately:

```ts
/**
 * A button component.
 * @public
 * @readme kind=Components
 */
export function Button({ label }: ButtonProps) {
  return <button>{label}</button>
}

/**
 * A modal component.
 * @public
 * @readme kind=Components
 */
export function Modal({ children }: ModalProps) {
  return <dialog>{children}</dialog>
}

/**
 * A utility function.
 * @public
 */
export function formatDate(date: Date): string { ... }
```

This produces two separate sections — **Components** and **Functions** — with
Components listed first. You can use any string: `Hooks`, `Utilities`,
`Guards`, etc.

#### `category`

Groups entries into top-level categories, producing a two-level structure
(`## Category` → `### Functions/Classes/Constants` → `#### entry`). Categories
are sorted alphabetically. Entries without a category fall into **General**,
which always appears last.

Can be combined with `kind`:

```ts
/** @public @readme category=Auth */
export function login(): void { ... }

/** @public @readme category=Auth kind=Components */
export function LoginForm(): JSX.Element { ... }

/** @public @readme category=Utility */
export function formatDate(date: Date): string { ... }
```

#### `order`

Sets the position of the entry in the rendered output. Entries with an explicit
order appear first (sorted by order value, then alphabetically on ties).
Entries without an order are sorted alphabetically after all ordered entries.

```ts
/**
 * @public
 * @readme order=1
 */
export function primaryFunction() { ... }

/**
 * @public
 * @readme order=2
 */
export function secondaryFunction() { ... }

/**
 * @public
 */
export function unorderedFunction() { ... }
```

## Configuration

By default the CLI scans `src/**/*.{ts,tsx,js,jsx}` and reads `.README.md` from
the current directory. To override, create a `readme.config.js` at the project
root:

```js
export default (defaults) => ({
  ...defaults,
  include: ['lib/**/*.ts'],
  ignore: [...defaults.ignore, '**/generated/**'],
})
```

Available options:

| Option         | Default                    | Description               |
| -------------- | -------------------------- | ------------------------- |
| `templatePath` | `.README.md`               | Path to the template file |
| `outputPath`   | `README.md`                | Path to write the output  |
| `include`      | `src/**/*.{ts,tsx,js,jsx}` | Glob patterns to scan     |
| `ignore`       | spec, test, d.ts, fixtures | Glob patterns to exclude  |

## API



**Parse:** [`parsePublicApi`](#parsepublicapi)

**Render:** [`renderDocs`](#renderdocs)

**Types:** [`Param`](#param) · [`PublicEntry`](#publicentry) · [`TypeDefinition`](#typedefinition) · [`ParseResult`](#parseresult)

## Parse


#### `parsePublicApi`

[src/parse.ts#L430](src/parse.ts#L430)

```ts
function parsePublicApi(
  filePaths: string[],
  compilerOptions?: CompilerOptions,
): ParseResult
```

Parses TypeScript/JavaScript source files and returns all functions, arrow
functions, and classes tagged with `@public` in their JSDoc comment.
Parameter types and return types are resolved from the TypeScript type
checker. Referenced local type definitions are collected and returned
alongside the entries in dependency order.

**Parameters**

- `filePaths` — `string[]` - absolute paths to source files to parse
- `compilerOptions` _(optional)_ — `CompilerOptions` - optional TypeScript compiler options override

**Returns** [`ParseResult`](#parseresult) — parsed entries and referenced local type definitions


## Render


#### `renderDocs`

[src/render.ts#L192](src/render.ts#L192)

```ts
function renderDocs(parseResult: ParseResult): string
```

**Parameters**

- `parseResult` — [`ParseResult`](#parseresult)

**Returns** `string`


## Types

### `Param`

[src/parse.ts#L5](src/parse.ts#L5)

```ts
export type Param = {
  name: string
  type: string
  optional: boolean
  description: string
}
```

### `PublicEntry`

[src/parse.ts#L12](src/parse.ts#L12)

```ts
export type PublicEntry = {
  name: string
  kind: 'function' | 'variable' | 'class' | 'constant'
  signature: string
  description: string
  params: Param[]
  returnType: string
  returnDescription: string
  examples: { name?: string; code: string }[]
  readmeConfig: Record<string, string>
  filePath: string
  relativeFilePath: string
  line: number
}
```

### `TypeDefinition`

[src/parse.ts#L27](src/parse.ts#L27)

```ts
export type TypeDefinition = {
  name: string
  text: string
  filePath: string
  relativeFilePath: string
  line: number
}
```

### `ParseResult`

[src/parse.ts#L35](src/parse.ts#L35)

```ts
export type ParseResult = {
  entries: PublicEntry[]
  types: TypeDefinition[]
}
```
