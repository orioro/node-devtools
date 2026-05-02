import * as ts from 'typescript'
import type { Param } from './types'
import { typeToString } from './utils'

export function getJsDocs(node: ts.Node): ts.JSDoc[] {
  return ((node as any).jsDoc as ts.JSDoc[] | undefined) ?? []
}

export function commentToString(
  comment: string | ts.NodeArray<ts.JSDocComment> | undefined,
): string {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  return comment.map((c) => (c as any).text ?? '').join('')
}

export function getJsDocDescription(node: ts.Node): string {
  return getJsDocs(node)
    .map((doc) => commentToString(doc.comment).trim())
    .filter(Boolean)
    .join('\n\n')
}

export function getJsDocTags(node: ts.Node): Map<string, string[]> {
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

export function getReadmeConfig(node: ts.Node): Record<string, string> {
  const tag = getJsDocTags(node).get('readme')?.[0]
  if (!tag) return {}
  return Object.fromEntries(
    tag
      .split(/\s+/)
      .filter((pair) => pair.includes('='))
      .map((pair) => pair.split('=') as [string, string]),
  )
}

export function parseExample(raw: string): { name?: string; code: string } {
  const caption = raw.match(/^<caption>(.*?)<\/caption>\n?/)
  if (caption)
    return {
      name: caption[1].trim(),
      code: raw.slice(caption[0].length).trim(),
    }
  return { code: raw.trim() }
}

export function getExamples(node: ts.Node): { name?: string; code: string }[] {
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

export function getName(node: ts.Node): string | undefined {
  const tags = getJsDocTags(node)
  if (tags.get('name')?.[0]) return tags.get('name')![0]
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text
  if (ts.isClassDeclaration(node) && node.name) return node.name.text
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
    return node.name.text
  return undefined
}

export function hasPublicTag(node: ts.Node): boolean {
  return getJsDocs(node).some((doc) =>
    doc.tags?.some((t) => t.tagName.text === 'public'),
  )
}

export function getParamDescriptions(node: ts.Node): Map<string, string> {
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

export function getParamTypes(node: ts.Node): Map<string, string> {
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

export function getReturnTypeStr(
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
