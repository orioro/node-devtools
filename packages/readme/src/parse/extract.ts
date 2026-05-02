import * as ts from 'typescript'
import type { Param, PublicEntry, RawEntry } from './types'
import {
  getJsDocDescription,
  getJsDocTags,
  getExamples,
  getReadmeConfig,
  getParamDescriptions,
  getParamTypes,
  getReturnTypeStr,
} from './jsdoc'
import { getLine, typeToString } from './utils'

export function buildSignature(
  name: string,
  params: Param[],
  returnType: string,
): string {
  const paramStr = params
    .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ')
  return `function ${name}(${paramStr}): ${returnType}`
}

export function extractConstant(
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

export function extractConstantFn(
  decl: ts.VariableDeclaration,
  name: string,
  type: ts.Type,
  checker: ts.TypeChecker,
  filePath: string,
  jsDocNode: ts.Node,
): RawEntry {
  const sig = type.getCallSignatures()[0]
  const paramDescs = getParamDescriptions(jsDocNode)
  const paramTypes = getParamTypes(jsDocNode)
  const tags = getJsDocTags(jsDocNode)

  const rawTypes: ts.Type[] = []

  const params: Param[] = sig.parameters.map((sym) => {
    const paramName = sym.getName()
    const paramType = checker.getTypeOfSymbol(sym)
    rawTypes.push(paramType)
    return {
      name: paramName,
      type: paramTypes.get(paramName) ?? typeToString(checker, paramType),
      optional: !!(sym.flags & ts.SymbolFlags.Optional),
      description: paramDescs.get(paramName) ?? '',
    }
  })

  const returnType = checker.getReturnTypeOfSignature(sig)
  rawTypes.push(returnType)
  const returnTypeStr = typeToString(checker, returnType)

  return {
    entry: {
      name,
      kind: 'function',
      signature: buildSignature(name, params, returnTypeStr),
      description: getJsDocDescription(jsDocNode),
      params,
      returnType: returnTypeStr,
      returnDescription:
        (tags.get('returns') ?? tags.get('return') ?? [])[0] ?? '',
      examples: getExamples(jsDocNode),
      readmeConfig: getReadmeConfig(jsDocNode),
      filePath,
      line: getLine(decl),
    },
    rawTypes,
  }
}

export function extractFromFunctionLike(
  node: ts.FunctionLikeDeclaration,
  name: string,
  checker: ts.TypeChecker,
  filePath: string,
  jsDocNode?: ts.Node,
): RawEntry {
  const docNode = jsDocNode ?? node
  const description = getJsDocDescription(docNode)
  const tags = getJsDocTags(docNode)
  const paramDescs = getParamDescriptions(docNode)
  const paramTypes = getParamTypes(docNode)

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
      examples: getExamples(docNode),
      readmeConfig: getReadmeConfig(docNode),
      filePath,
      line: getLine(node),
    },
    rawTypes,
  }
}
