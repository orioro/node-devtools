import * as ts from 'typescript'
import type { ParseResult, RawEntry } from './types'
import { collectTypeDefs, collectTypeDefsFromSymbol } from './typeCollect'
import { visitNode } from './visitor'

export type { Param, PublicEntry, TypeDefinition, ParseResult } from './types'

/**
 * Parses TypeScript/JavaScript source files and returns all functions, arrow
 * functions, and classes tagged with `@public` in their JSDoc comment.
 * Parameter types and return types are resolved from the TypeScript type
 * checker. Referenced local type definitions are collected and returned
 * alongside the entries in dependency order.
 * @param filePaths - absolute paths to source files to parse
 * @param compilerOptions - optional TypeScript compiler options override
 * @returns parsed entries and referenced local type definitions
 *
 * @example <caption>Basic usage</caption>
 * import { parsePublicApi } from '@orioro/readme'
 * import { resolve } from 'node:path'
 * import fg from 'fast-glob'
 *
 * const files = await fg('src/**\/*.ts', { absolute: true })
 * const result = parsePublicApi(files.map((f) => resolve(f)))
 *
 * @example <caption>Custom compiler options</caption>
 * import { ScriptTarget } from 'typescript'
 *
 * const result = parsePublicApi(files, {
 *   strict: false,
 *   target: ScriptTarget.ES2020,
 * })
 * @readme category=Parse
 * @public
 */
export function parsePublicApi(
  filePaths: string[],
  compilerOptions: ts.CompilerOptions = {},
): ParseResult {
  const program = ts.createProgram(filePaths, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    strict: true,
    ...compilerOptions,
  })
  const checker = program.getTypeChecker()
  const sourceFileNames = new Set(filePaths)
  const rawEntries: RawEntry[] = []

  for (const filePath of filePaths) {
    const sourceFile = program.getSourceFile(filePath)
    if (!sourceFile) continue
    ts.forEachChild(sourceFile, (node) =>
      visitNode(node, checker, filePath, rawEntries, program, sourceFileNames),
    )
  }

  const seen = new Set<ts.Symbol>()
  const visitedTypes = new Set<ts.Type>()
  const types: import('./types').TypeDefinition[] = []

  for (const { rawTypes, rawSymbols } of rawEntries) {
    for (const type of rawTypes) {
      collectTypeDefs(type, checker, sourceFileNames, seen, types, visitedTypes)
    }
    for (const symbol of rawSymbols ?? []) {
      collectTypeDefsFromSymbol(symbol, checker, sourceFileNames, seen, types, visitedTypes)
    }
  }

  return {
    entries: rawEntries.map((r) => r.entry),
    types,
  }
}
