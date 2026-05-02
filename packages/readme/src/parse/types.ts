import * as ts from 'typescript'

export type Param = {
  name: string
  type: string
  optional: boolean
  description: string
}

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
  line: number
}

export type TypeDefinition = {
  name: string
  text: string
  references: string[]
  filePath: string
  line: number
}

export type ParseResult = {
  entries: PublicEntry[]
  types: TypeDefinition[]
}

export type RawEntry = {
  entry: PublicEntry
  rawTypes: ts.Type[]
  rawSymbols?: ts.Symbol[]
}
