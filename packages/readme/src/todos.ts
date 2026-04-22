import * as ts from 'typescript'
import { readFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { packageUpSync } from 'package-up'

export type TodoEntry = {
  text: string
  filePath: string
  relativeFilePath: string
  line: number
}

const TODO_PATTERN = /todo:?/i
const IGNORE_MARKER = '[readme-ignore]'

function commentToText(
  comment: string | ts.NodeArray<ts.JSDocComment> | undefined,
): string {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  return comment.map((c) => (c as any).text ?? '').join('')
}

function parseFileTodos(
  filePath: string,
  relativeFilePath: string,
): TodoEntry[] {
  const source = readFileSync(filePath, 'utf8')
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
  const todos: TodoEntry[] = []

  function lineAt(pos: number): number {
    return sf.getLineAndCharacterOfPosition(pos).line + 1
  }

  // Collect all unique comment ranges across the whole file
  const seenPos = new Set<number>()
  const allRanges: ts.CommentRange[] = []

  function collectRanges(node: ts.Node) {
    const leading = ts.getLeadingCommentRanges(source, node.pos) ?? []
    const trailing = ts.getTrailingCommentRanges(source, node.end) ?? []
    for (const r of [...leading, ...trailing]) {
      if (!seenPos.has(r.pos)) {
        seenPos.add(r.pos)
        allRanges.push(r)
      }
    }
    ts.forEachChild(node, collectRanges)
  }
  collectRanges(sf)
  allRanges.sort((a, b) => a.pos - b.pos)

  // Single-line // comments: group consecutive lines after a TODO [readme-ignore] line
  const consumedPos = new Set<number>()
  for (let i = 0; i < allRanges.length; i++) {
    const range = allRanges[i]
    if (range.kind !== ts.SyntaxKind.SingleLineCommentTrivia) continue
    if (consumedPos.has(range.pos)) continue
    const text = source.slice(range.pos, range.end)
    if (!TODO_PATTERN.test(text)) continue
    if (text.includes(IGNORE_MARKER)) continue

    const startLine = lineAt(range.pos)
    const firstText = text
      .replace(/^\/\/\s*/, '')
      .replace(TODO_PATTERN, '')
      .replace(/^:?\s*/, '')
      .trim()
    const textLines = [firstText]
    consumedPos.add(range.pos)

    let prevLine = startLine
    for (let j = i + 1; j < allRanges.length; j++) {
      const next = allRanges[j]
      if (next.kind !== ts.SyntaxKind.SingleLineCommentTrivia) break
      if (lineAt(next.pos) !== prevLine + 1) break
      const nextText = source
        .slice(next.pos, next.end)
        .replace(/^\/\/\s*/, '')
        .trim()
      textLines.push(nextText)
      consumedPos.add(next.pos)
      prevLine++
    }

    todos.push({
      text: textLines.filter(Boolean).join(' '),
      filePath,
      relativeFilePath,
      line: startLine,
    })
  }

  // Multi-line /* */ block comments — skip /** JSDoc blocks (handled via @todo [readme-ignore] below)
  for (const range of allRanges) {
    if (range.kind !== ts.SyntaxKind.MultiLineCommentTrivia) continue
    const text = source.slice(range.pos, range.end)
    if (text.startsWith('/**')) continue // JSDoc — handled by @todo [readme-ignore] tag handler
    if (!TODO_PATTERN.test(text)) continue
    if (text.includes(IGNORE_MARKER)) continue

    const startLine = lineAt(range.pos)
    const inner = text
      .replace(/^\/\*+/, '')
      .replace(/\*+\/$/, '')
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean)
      .join(' ')
    const cleaned = inner
      .replace(TODO_PATTERN, '')
      .replace(/^:?\s*/, '')
      .trim()
    todos.push({ text: cleaned, filePath, relativeFilePath, line: startLine })
  }

  // @todo [readme-ignore] JSDoc tags — TypeScript gives us multi-line tag content for free
  function visitForJsDoc(node: ts.Node) {
    for (const tag of ts.getJSDocTags(node)) {
      if (tag.tagName.text.toLowerCase() === 'todo') {
        const text = commentToText(tag.comment).trim().replace(/\r?\n/g, ' ')

        if (text && !text.includes(IGNORE_MARKER))
          todos.push({
            text,
            filePath,
            relativeFilePath,
            line: lineAt(tag.pos),
          })
      }
    }
    ts.forEachChild(node, visitForJsDoc)
  }
  visitForJsDoc(sf)

  return todos.sort((a, b) => a.line - b.line)
}

/**
 * Scans source files for TODO comments (`// TODO:`, `/* TODO`, `@todo`)
 * and returns a flat list of entries with their location. Multi-line content
 * is captured in full for all comment types.
 * @param filePaths - absolute paths to source files to scan
 * @returns todo entries in source order, grouped by file
 * @public
 */
export function parseTodos(filePaths: string[]): TodoEntry[] {
  const pkgPath = packageUpSync({ cwd: filePaths[0] })
  const pkgRoot = pkgPath ? dirname(pkgPath) : process.cwd()

  return filePaths.flatMap((filePath) =>
    parseFileTodos(filePath, relative(pkgRoot, filePath)),
  )
}

/**
 * Renders a list of `TodoEntry` items into a markdown TODO file, grouped by
 * source file. Files with no TODOs are omitted. If the list is empty, returns
 * a "No TODOs found" message.
 * @param todos - entries returned by `parseTodos`
 * @returns markdown string
 * @public
 */
export function renderTodos(todos: TodoEntry[]): string {
  if (todos.length === 0) return ''

  const byFile: Record<string, TodoEntry[]> = {}
  for (const todo of todos) {
    if (!byFile[todo.relativeFilePath]) byFile[todo.relativeFilePath] = []
    byFile[todo.relativeFilePath].push(todo)
  }

  const lines: string[] = ['# TODO', '']
  for (const [file, entries] of Object.entries(byFile)) {
    lines.push(`## ${file}`, '')
    for (const entry of entries) {
      lines.push(
        `- [ ] ${entry.text} ([${file}#L${entry.line}](${file}#L${entry.line}))`,
      )
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}
