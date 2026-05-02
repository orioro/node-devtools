import * as ts from 'typescript'
import type { Param, RawEntry } from './types'
import {
  getJsDocDescription,
  getJsDocTags,
  getExamples,
  getReadmeConfig,
  getParamDescriptions,
} from './jsdoc'
import { collectTypeDefsFromSymbol } from './typeCollect'

type ParsedSignature = {
  params: Omit<Param, 'description'>[]
  returnType: string
  typeRefNames: string[]
}

function tryParseAsFunction(candidate: string): ParsedSignature | null {
  const src = ts.createSourceFile(
    '__sig.ts',
    `${candidate} {}`,
    ts.ScriptTarget.ESNext,
    false,
  )

  let params: Omit<Param, 'description'>[] | null = null
  let returnType = 'unknown'
  const typeRefNames: string[] = []

  const collectTypeRefs = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node)) {
      typeRefNames.push(node.typeName.getText(src).split('.')[0])
    }
    ts.forEachChild(node, collectTypeRefs)
  }

  const walk = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node)) {
      params = node.parameters.map((p) => ({
        name: p.name.getText(src),
        type: p.type ? p.type.getText(src) : 'unknown',
        optional: !!p.questionToken || p.initializer !== undefined,
      }))
      if (node.type) {
        returnType = node.type.getText(src)
        collectTypeRefs(node.type)
      }
      for (const p of node.parameters) {
        if (p.type) collectTypeRefs(p.type)
      }
      return
    }
    ts.forEachChild(node, walk)
  }
  walk(src)

  if (!params) return null
  return { params, returnType, typeRefNames: Array.from(new Set(typeRefNames)) }
}

export function parseSignatureTag(sigStr: string): ParsedSignature | null {
  // Try as-is first (expects 'function foo(...)' form)
  // Fall back to prepending 'function' for short-form ('foo(...): ReturnType')
  return tryParseAsFunction(sigStr) ?? tryParseAsFunction(`function ${sigStr}`)
}

export function resolveSymbolsByName(
  names: string[],
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
  program: ts.Program,
): ts.Symbol[] {
  const symbols: ts.Symbol[] = []
  for (const name of names) {
    let resolved = false
    for (const sf of program.getSourceFiles()) {
      if (!sourceFileNames.has(sf.fileName) || resolved) continue
      const findInNode = (node: ts.Node): void => {
        if (resolved) return
        if (
          (ts.isTypeAliasDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isEnumDeclaration(node)) &&
          node.name.text === name
        ) {
          const sym = checker.getSymbolAtLocation(node.name)
          if (sym) {
            symbols.push(sym)
            resolved = true
          }
          return
        }
        if (ts.isClassDeclaration(node) && node.name?.text === name) {
          const sym = checker.getSymbolAtLocation(node.name)
          if (sym) {
            symbols.push(sym)
            resolved = true
          }
          return
        }
        ts.forEachChild(node, findInNode)
      }
      findInNode(sf)
    }
  }
  return symbols
}

export function buildSignatureEntry(
  name: string,
  sigTag: string,
  jsDocNode: ts.Node,
  filePath: string,
  line: number,
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
  program: ts.Program,
): RawEntry | null {
  // Strip surrounding backticks — users may write @signature `foo(): Bar`
  const cleanSigTag = sigTag.replace(/^`|`$/g, '').trim()
  const parsed = parseSignatureTag(cleanSigTag)
  if (!parsed) return null
  const paramDescs = getParamDescriptions(jsDocNode)
  const tags = getJsDocTags(jsDocNode)
  return {
    entry: {
      name,
      kind: 'function',
      signature: cleanSigTag,
      description: getJsDocDescription(jsDocNode),
      params: parsed.params.map((p) => ({
        ...p,
        description: paramDescs.get(p.name) ?? '',
      })),
      returnType: parsed.returnType,
      returnDescription:
        (tags.get('returns') ?? tags.get('return') ?? [])[0] ?? '',
      examples: getExamples(jsDocNode),
      readmeConfig: getReadmeConfig(jsDocNode),
      filePath,
      line,
    },
    rawTypes: [],
    rawSymbols: resolveSymbolsByName(
      parsed.typeRefNames,
      checker,
      sourceFileNames,
      program,
    ),
  }
}
