import { relative } from 'node:path'
import synchronizedPrettier from '@prettier/sync'
import type { PublicEntry, TypeDefinition, ParseResult } from './parse.js'

function sourceLink(filePath: string, line: number): string {
  const rel = relative(process.cwd(), filePath)
  return `[source](${rel}#L${line})`
}

const PRETTIER_OPTIONS = {
  parser: 'typescript',
  semi: false,
  singleQuote: true,
  jsxBracketSameLine: true,
  printWidth: 80,
} as const

function formatSignature(sig: string): string {
  try {
    return synchronizedPrettier.format(sig, PRETTIER_OPTIONS).trim()
  } catch {
    return sig
  }
}

// GitHub anchor format: lowercase, strip everything except letters/numbers/hyphens
function toAnchor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function renderToc(types: TypeDefinition[], entries: PublicEntry[]): string {
  const lines: string[] = []

  if (entries.length > 0) {
    lines.push(
      '**API:** ' +
        entries.map((e) => `[\`${e.name}\`](#${toAnchor(e.name)})`).join(' · '),
    )
  }

  if (types.length > 0) {
    lines.push(
      '**Types:** ' +
        types.map((t) => `[\`${t.name}\`](#${toAnchor(t.name)})`).join(' · '),
    )
  }

  return lines.join('\n\n')
}

function renderEntry(entry: PublicEntry): string {
  const lines: string[] = []

  lines.push(`### \`${entry.name}\` — ${sourceLink(entry.filePath, entry.line)}`)
  lines.push('')
  lines.push('```ts')
  lines.push(formatSignature(entry.signature))
  lines.push('```')

  if (entry.description) {
    lines.push('')
    lines.push(entry.description)
  }

  if (entry.params.length > 0) {
    lines.push('')
    lines.push('**Parameters**')
    lines.push('')
    for (const p of entry.params) {
      const optional = p.optional ? ' _(optional)_' : ''
      const desc = p.description ? ` ${p.description}` : ''
      lines.push(`- \`${p.name}\`${optional} — \`${p.type}\`${desc}`)
    }
  }

  if (entry.returnType && entry.returnType !== 'void') {
    lines.push('')
    const desc = entry.returnDescription ? ` — ${entry.returnDescription}` : ''
    lines.push(`**Returns** \`${entry.returnType}\`${desc}`)
  }

  for (const example of entry.examples) {
    lines.push('')
    lines.push('**Example**')
    lines.push('')
    lines.push('```ts')
    lines.push(example.trim())
    lines.push('```')
  }

  return lines.join('\n')
}

function renderTypes(types: TypeDefinition[]): string {
  if (types.length === 0) return ''

  const lines: string[] = ['## Types', '']

  for (const t of types) {
    lines.push(`### \`${t.name}\` — ${sourceLink(t.filePath, t.line)}`)
    lines.push('')
    lines.push('```ts')
    lines.push(formatSignature(t.text))
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

/** @public */
export function renderDocs({ entries, types }: ParseResult): string {
  if (entries.length === 0) return ''

  const sections: string[] = []

  sections.push(renderToc(types, entries))

  const apiLines: string[] = ['## API', '']
  for (const entry of entries) {
    apiLines.push(renderEntry(entry))
    apiLines.push('')
  }
  sections.push(apiLines.join('\n'))

  const typesSection = renderTypes(types)
  if (typesSection) sections.push(typesSection)

  return sections.join('\n\n')
}
