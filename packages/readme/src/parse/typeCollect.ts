import * as ts from 'typescript'
import type { TypeDefinition } from './types'
import { getLine, typeToString } from './utils'

export function walkTypeRefs(
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

export function getDirectTypeRefNames(
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

export function collectTypeDefs(
  type: ts.Type,
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
  seen: Set<ts.Symbol>,
  result: TypeDefinition[],
  visitedTypes: Set<ts.Type>,
) {
  if (visitedTypes.has(type)) return
  visitedTypes.add(type)

  const symbol = type.aliasSymbol ?? type.symbol

  if (symbol && !seen.has(symbol)) {
    seen.add(symbol)

    const isAnonymous =
      symbol.getName() === '__type' || symbol.getName() === '__object'
    const isTypeParam = !!(symbol.flags & ts.SymbolFlags.TypeParameter)
    if (isAnonymous || isTypeParam) return

    const localDecl = (symbol.declarations ?? []).find((d) =>
      sourceFileNames.has(d.getSourceFile().fileName),
    )

    if (localDecl) {
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

export function collectTypeDefsFromSymbol(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  sourceFileNames: Set<string>,
  seen: Set<ts.Symbol>,
  result: TypeDefinition[],
  visitedTypes: Set<ts.Type>,
) {
  if (seen.has(symbol)) return
  seen.add(symbol)

  const name = symbol.getName()
  if (name === '__type' || name === '__object') return
  if (symbol.flags & ts.SymbolFlags.TypeParameter) return

  const localDecl = (symbol.declarations ?? []).find((d) =>
    sourceFileNames.has(d.getSourceFile().fileName),
  )
  if (!localDecl) return

  walkTypeRefs(localDecl, checker, sourceFileNames, seen, result, visitedTypes)
  result.push({
    name,
    text: localDecl.getText().trim(),
    references: getDirectTypeRefNames(localDecl, checker, sourceFileNames),
    filePath: localDecl.getSourceFile().fileName,
    line: getLine(localDecl),
  })
}
