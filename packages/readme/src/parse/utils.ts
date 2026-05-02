import * as ts from 'typescript'

export function getLine(node: ts.Node): number {
  const sf = node.getSourceFile()
  return sf.getLineAndCharacterOfPosition(node.getStart()).line + 1
}

export function typeToString(checker: ts.TypeChecker, type: ts.Type): string {
  return checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation)
}
