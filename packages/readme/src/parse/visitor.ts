import * as ts from 'typescript'
import type { RawEntry } from './types'
import {
  hasPublicTag,
  getJsDocTags,
  getJsDocDescription,
  getExamples,
  getReadmeConfig,
  getName,
} from './jsdoc'
import { extractConstant, extractConstantFn, extractFromFunctionLike } from './extract'
import { buildSignatureEntry } from './signatureTag'
import { getLine } from './utils'

export function visitNode(
  node: ts.Node,
  checker: ts.TypeChecker,
  filePath: string,
  rawEntries: RawEntry[],
  program: ts.Program,
  sourceFileNames: Set<string>,
) {
  if (!hasPublicTag(node)) {
    ts.forEachChild(node, (child) =>
      visitNode(child, checker, filePath, rawEntries, program, sourceFileNames),
    )
    return
  }

  if (ts.isFunctionDeclaration(node) && node.name) {
    const sigTag = getJsDocTags(node).get('signature')?.[0]
    if (sigTag) {
      const sigEntry = buildSignatureEntry(
        getName(node)!,
        sigTag,
        node,
        filePath,
        getLine(node),
        checker,
        sourceFileNames,
        program,
      )
      if (sigEntry) {
        rawEntries.push(sigEntry)
        return
      }
    }
    rawEntries.push(
      extractFromFunctionLike(node, getName(node)!, checker, filePath),
    )
    return
  }

  if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue
      const name = getName(node) ?? decl.name.text
      const sigTag = getJsDocTags(node).get('signature')?.[0]
      if (sigTag) {
        const sigEntry = buildSignatureEntry(
          name,
          sigTag,
          node,
          filePath,
          getLine(decl),
          checker,
          sourceFileNames,
          program,
        )
        if (sigEntry) {
          rawEntries.push(sigEntry)
          continue
        }
      }
      const init = decl.initializer
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        rawEntries.push(extractFromFunctionLike(init, name, checker, filePath, node))
      } else {
        const type = checker.getTypeAtLocation(decl)
        if (type.getCallSignatures().length > 0) {
          rawEntries.push(extractConstantFn(decl, name, type, checker, filePath, node))
        } else {
          rawEntries.push(extractConstant(decl, checker, filePath, node))
        }
      }
    }
    return
  }

  if (ts.isClassDeclaration(node) && node.name) {
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
