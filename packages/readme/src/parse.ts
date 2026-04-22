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

// ---------- JSDoc helpers ----------

function getJsDocs(node: ts.Node): ts.JSDoc[] {
  return ((node as any).jsDoc as ts.JSDoc[] | undefined) ?? []
}

function commentToString(
  comment: string | ts.NodeArray<ts.JSDocComment> | undefined,
): string {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  return comment.map((c) => (c as any).text ?? '').join('')
}

function getJsDocDescription(node: ts.Node): string {
  return getJsDocs(node)
    .map((doc) => commentToString(doc.comment).trim())
    .filter(Boolean)
    .join('\n\n')
}

function getJsDocTags(node: ts.Node): Map<string, string[]> {
  const tags = new Map<string, string[]>()
  for (const doc of getJsDocs(node)) {
    for (const tag of doc.tags ?? []) {
      const name = tag.tagName.text
      const text = commentToString(tag.comment).trim()
      const existing = tags.get(name) ?? []
      existing.push(text)
      tags.set(name, existing)
    }
  }
  return tags
}

function getReadmeConfig(node: ts.Node): Record<string, string> {
  const tag = getJsDocTags(node).get('readme')?.[0]
  if (!tag) return {}
  return Object.fromEntries(
    tag
      .split(/\s+/)
      .filter((pair) => pair.includes('='))
      .map((pair) => pair.split('=') as [string, string]),
  )
}

function parseExample(raw: string): { name?: string; code: string } {
  const caption = raw.match(/^<caption>(.*?)<\/caption>\n?/)
  if (caption)
    return {
      name: caption[1].trim(),
      code: raw.slice(caption[0].length).trim(),
    }
  return { code: raw.trim() }
}

function getExamples(node: ts.Node): { name?: string; code: string }[] {
  const examples: { name?: string; code: string }[] = []
  for (const doc of getJsDocs(node)) {
    for (const tag of doc.tags ?? []) {
      if (tag.tagName.text === 'example') {
        examples.push(parseExample(commentToString(tag.comment)))
      }
    }
  }
  return examples
}

function getName(node: ts.Node): string | undefined {
  const tags = getJsDocTags(node)
  if (tags.get('name')?.[0]) return tags.get('name')![0]
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text
  if (ts.isClassDeclaration(node) && node.name) return node.name.text
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
    return node.name.text
  return undefined
}

function hasPublicTag(node: ts.Node): boolean {
  return getJsDocs(node).some((doc) =>
    doc.tags?.some((t) => t.tagName.text === 'public'),
  )
}

function getParamDescriptions(node: ts.Node): Map<string, string> {
  const map = new Map<string, string>()
  for (const doc of getJsDocs(node)) {
    for (const tag of doc.tags ?? []) {
      if (ts.isJSDocParameterTag(tag)) {
        const name = tag.name.getText()
        map.set(name, commentToString(tag.comment).trim())
      }
    }
  }
  return map
}

function getParamTypes(node: ts.Node): Map<string, string> {
  const map = new Map<string, string>()
  for (const doc of getJsDocs(node)) {
    for (const tag of doc.tags ?? []) {
      if (ts.isJSDocParameterTag(tag) && tag.typeExpression) {
        const name = tag.name.getText()
        map.set(name, tag.typeExpression.type.getText())
      }
    }
  }
  return map
}

function getReturnTypeStr(
  node: ts.FunctionLikeDeclaration,
  checker: ts.TypeChecker,
): string {
  for (const doc of getJsDocs(node)) {
    for (const tag of doc.tags ?? []) {
      if (ts.isJSDocReturnTag(tag) && tag.typeExpression) {
        return tag.typeExpression.type.getText()
      }
    }
  }
  const sig = checker.getSignatureFromDeclaration(node)
  const returnType = sig ? checker.getReturnTypeOfSignature(sig) : undefined
  return returnType ? typeToString(checker, returnType) : 'unknown'
}

// ---------- Type helpers ----------

function getLine(node: ts.Node): number {
  const sf = node.getSourceFile()
  return sf.getLineAndCharacterOfPosition(node.getStart()).line + 1
}

function typeToString(checker: ts.TypeChecker, type: ts.Type): string {
  return checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation)
}

// Walk a declaration node and collect all TypeReferenceNodes, resolving each
// to a named local type. Called depth-first so dependencies are added before
// the type that references them.
function walkTypeRefs(
  node: ts.Node,
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
  seen: Set<ts.Symbol>,
  result: TypeDefinition[],
  visitedTypes: Set<ts.Type>,
) {
  if (ts.isTypeReferenceNode(node)) {
    const type = checker.getTypeAtLocation(node)
    collectTypeDefs(type, checker, sourceFileNames, seen, result, visitedTypes)
  }
  ts.forEachChild(node, (child) =>
    walkTypeRefs(child, checker, sourceFileNames, seen, result, visitedTypes),
  )
}

function getDirectTypeRefNames(
  node: ts.Node,
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
): string[] {
  const names: string[] = []
  function walk(n: ts.Node) {
    if (ts.isTypeReferenceNode(n)) {
      const type = checker.getTypeAtLocation(n)
      const symbol = type.aliasSymbol ?? type.symbol
      if (symbol) {
        const isLocal = (symbol.declarations ?? []).some((d) =>
          sourceFileNames.has(d.getSourceFile().fileName),
        )
        if (isLocal) {
          const name = symbol.getName()
          if (name !== '__type' && name !== '__object') names.push(name)
        }
      }
    }
    ts.forEachChild(n, walk)
  }
  walk(node)
  return Array.from(new Set(names))
}

function collectTypeDefs(
  type: ts.Type,
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
  seen: Set<ts.Symbol>,
  result: TypeDefinition[],
  visitedTypes: Set<ts.Type>,
) {
  if (visitedTypes.has(type)) return
  visitedTypes.add(type)

  // Prefer aliasSymbol (captures `type Foo = ...`) over structural symbol
  const symbol = type.aliasSymbol ?? type.symbol

  if (symbol && !seen.has(symbol)) {
    seen.add(symbol)

    // Skip anonymous/synthetic types and generic type parameters (T, K, V …)
    const isAnonymous =
      symbol.getName() === '__type' || symbol.getName() === '__object'
    const isTypeParam = !!(symbol.flags & ts.SymbolFlags.TypeParameter)
    if (isAnonymous || isTypeParam) return

    const localDecl = (symbol.declarations ?? []).find((d) =>
      sourceFileNames.has(d.getSourceFile().fileName),
    )

    if (localDecl) {
      // Recurse into this declaration first → dependencies output before dependents
      walkTypeRefs(
        localDecl,
        checker,
        sourceFileNames,
        seen,
        result,
        visitedTypes,
      )

      result.push({
        name: symbol.getName(),
        text: localDecl.getText().trim(),
        references: getDirectTypeRefNames(localDecl, checker, sourceFileNames),
        filePath: localDecl.getSourceFile().fileName,
        line: getLine(localDecl),
      })
      return
    }
  }

  // For generic instantiations (e.g. Promise<User>, Partial<User>), recurse
  // into the type arguments even if the outer type isn't local
  const typeArgs =
    (type as ts.TypeReference).typeArguments ?? type.aliasTypeArguments

  for (const arg of typeArgs ?? []) {
    collectTypeDefs(arg, checker, sourceFileNames, seen, result, visitedTypes)
  }

  if (type.isUnion() || type.isIntersection()) {
    for (const t of type.types) {
      collectTypeDefs(t, checker, sourceFileNames, seen, result, visitedTypes)
    }
  }
}

// ---------- Entry extraction ----------

function extractConstant(
  decl: ts.VariableDeclaration,
  checker: ts.TypeChecker,
  filePath: string,
  jsDocNode: ts.Node,
): RawEntry {
  const name = (decl.name as ts.Identifier).text
  const type = checker.getTypeAtLocation(decl)
  const typeStr = typeToString(checker, type)

  return {
    entry: {
      name,
      kind: 'constant',
      signature: `const ${name}: ${typeStr}`,
      description: getJsDocDescription(jsDocNode),
      params: [],
      returnType: '',
      returnDescription: '',
      examples: getExamples(jsDocNode),
      readmeConfig: getReadmeConfig(jsDocNode),
      filePath,
      line: getLine(decl),
    },
    rawTypes: [type],
  }
}

function buildSignature(
  name: string,
  params: Param[],
  returnType: string,
): string {
  const paramStr = params
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ')
  return `function ${name}(${paramStr}): ${returnType}`
}

type RawEntry = {
  entry: PublicEntry
  rawTypes: ts.Type[]
}

function extractFromFunctionLike(
  node: ts.FunctionLikeDeclaration,
  name: string,
  checker: ts.TypeChecker,
  filePath: string,
): RawEntry {
  const description = getJsDocDescription(node)
  const tags = getJsDocTags(node)
  const paramDescs = getParamDescriptions(node)
  const paramTypes = getParamTypes(node)

  const rawTypes: ts.Type[] = []

  const params: Param[] = node.parameters.map((p) => {
    const paramName = p.name.getText()
    const paramType = checker.getTypeAtLocation(p)
    rawTypes.push(paramType)
    return {
      name: paramName,
      type: paramTypes.get(paramName) ?? typeToString(checker, paramType),
      optional: !!p.questionToken || p.initializer !== undefined,
      description: paramDescs.get(paramName) ?? '',
    }
  })

  const sig = checker.getSignatureFromDeclaration(node)
  const returnType = sig ? checker.getReturnTypeOfSignature(sig) : undefined
  const returnTypeStr = getReturnTypeStr(node, checker)
  if (returnType) rawTypes.push(returnType)

  return {
    entry: {
      name,
      kind: 'function',
      signature: buildSignature(name, params, returnTypeStr),
      description,
      params,
      returnType: returnTypeStr,
      returnDescription:
        (tags.get('returns') ?? tags.get('return') ?? [])[0] ?? '',
      examples: getExamples(node),
      readmeConfig: getReadmeConfig(node),
      filePath,
      line: getLine(node),
    },
    rawTypes,
  }
}

// ---------- AST visitor ----------

function visitNode(
  node: ts.Node,
  checker: ts.TypeChecker,
  filePath: string,
  rawEntries: RawEntry[],
) {
  if (!hasPublicTag(node)) {
    ts.forEachChild(node, (child) =>
      visitNode(child, checker, filePath, rawEntries),
    )
    return
  }

  if (ts.isFunctionDeclaration(node) && node.name) {
    rawEntries.push(
      extractFromFunctionLike(node, getName(node)!, checker, filePath),
    )
    return
  }

  if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue
      const init = decl.initializer
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        const name = getName(node) ?? decl.name.text
        rawEntries.push(extractFromFunctionLike(init, name, checker, filePath))
      } else {
        rawEntries.push(extractConstant(decl, checker, filePath, node))
      }
    }
    return
  }

  if (ts.isClassDeclaration(node) && node.name) {
    const tags = getJsDocTags(node)
    const name = getName(node)!
    rawEntries.push({
      entry: {
        name,
        kind: 'class',
        signature: `class ${name}`,
        description: getJsDocDescription(node),
        params: [],
        returnType: '',
        returnDescription: '',
        examples: getExamples(node),
        readmeConfig: getReadmeConfig(node),
        filePath,
        line: getLine(node),
      },
      rawTypes: [],
    })
    return
  }
}

// ---------- Public API ----------

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
      visitNode(node, checker, filePath, rawEntries),
    )
  }

  // Collect referenced local type definitions from all entry types
  const seen = new Set<ts.Symbol>()
  const visitedTypes = new Set<ts.Type>()
  const types: TypeDefinition[] = []

  for (const { rawTypes } of rawEntries) {
    for (const type of rawTypes) {
      collectTypeDefs(type, checker, sourceFileNames, seen, types, visitedTypes)
    }
  }

  return {
    entries: rawEntries.map((r) => r.entry),
    types,
  }
}
