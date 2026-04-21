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

### `parsePublicApi`

[src/parse.ts#L406](src/parse.ts#L406)

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

### `renderDocs`

[src/render.ts#L125](src/render.ts#L125)

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
