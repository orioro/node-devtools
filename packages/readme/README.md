# @orioro/readme

Scans TypeScript source files for `@public`-tagged functions and generates
markdown API documentation appended to a `.README.md` template.

## Usage

```
yarn readme
```

Reads `.README.md` from the current directory, scans `src/**/*.{ts,tsx,js,jsx}`
for `@public` JSDoc tags, and writes `README.md` with the API section appended.

**API:** [`parsePublicApi`](#parsepublicapi) · [`renderDocs`](#renderdocs)

**Types:** [`Param`](#param) · [`PublicEntry`](#publicentry) · [`TypeDefinition`](#typedefinition) · [`ParseResult`](#parseresult)

## API

### `parsePublicApi` — [source](src/parse.ts#L353)

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

### `renderDocs` — [source](src/render.ts#L124)

```ts
function renderDocs(parseResult: ParseResult): string
```

**Parameters**

- `parseResult` — [`ParseResult`](#parseresult)

**Returns** `string`


## Types

### `Param` — [source](src/parse.ts#L3)

```ts
export type Param = {
  name: string
  type: string
  optional: boolean
  description: string
}
```

### `PublicEntry` — [source](src/parse.ts#L10)

```ts
export type PublicEntry = {
  name: string
  kind: 'function' | 'variable' | 'class' | 'constant'
  signature: string
  description: string
  params: Param[]
  returnType: string
  returnDescription: string
  examples: string[]
  filePath: string
  line: number
}
```

### `TypeDefinition` — [source](src/parse.ts#L23)

```ts
export type TypeDefinition = {
  name: string
  text: string
  filePath: string
  line: number
}
```

### `ParseResult` — [source](src/parse.ts#L30)

```ts
export type ParseResult = {
  entries: PublicEntry[]
  types: TypeDefinition[]
}
```
