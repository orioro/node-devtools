import synchronizedPrettier from '@prettier/sync'
import type { PublicEntry, TypeDefinition, ParseResult } from './parse.js'

function sourceLink(relativeFilePath: string, line: number): string {
  return `[${relativeFilePath}#L${line}](${relativeFilePath}#L${line})`
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

const BUILTIN_SECTIONS = ['Functions', 'Classes', 'Constants']

const BUILTIN_SECTION_MAP: Record<string, string> = {
  function: 'Functions',
  class: 'Classes',
  constant: 'Constants',
}

function getSectionName(entry: PublicEntry): string {
  return (
    entry.readmeConfig.kind ?? BUILTIN_SECTION_MAP[entry.kind] ?? 'Functions'
  )
}

type SectionGroup = { section: string; entries: PublicEntry[] }

function groupBySection(entries: PublicEntry[]): SectionGroup[] {
  const map: Record<string, PublicEntry[]> = {}
  for (const entry of entries) {
    const section = getSectionName(entry)
    if (!map[section]) map[section] = []
    map[section].push(entry)
  }
  const custom = Object.keys(map).filter((k) => !BUILTIN_SECTIONS.includes(k))
  const builtin = BUILTIN_SECTIONS.filter(
    (k) => Array.isArray(map[k]) && map[k].length > 0,
  )
  return [...custom, ...builtin].map((section) => ({
    section,
    entries: map[section],
  }))
}

function renderToc(types: TypeDefinition[], groups: SectionGroup[]): string {
  const lines: string[] = ['## API', '']

  for (const { section, entries } of groups) {
    lines.push(
      `**${section}:** ` +
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

function renderEntry(entry: PublicEntry, { types }: ParseResult): string {
  const lines: string[] = []
  const definedTypeNames = types.map((t) => t.name)

  lines.push(`### \`${entry.name}\``)
  lines.push('')
  lines.push(`${sourceLink(entry.relativeFilePath, entry.line)}`)
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
      const typeText = definedTypeNames.includes(p.type)
        ? `[\`${p.type}\`](#${toAnchor(p.type)})`
        : `\`${p.type}\``
      lines.push(`- \`${p.name}\`${optional} — ${typeText}${desc}`)
    }
  }

  if (entry.returnType && entry.returnType !== 'void') {
    lines.push('')
    const desc = entry.returnDescription ? ` — ${entry.returnDescription}` : ''

    const typeText = definedTypeNames.includes(entry.returnType)
      ? `[\`${entry.returnType}\`](#${toAnchor(entry.returnType)})`
      : `\`${entry.returnType}\``

    lines.push(`**Returns** ${typeText}${desc}`)
  }

  for (const [i, example] of entry.examples.entries()) {
    const label = example.name ? `Example: ${example.name}` : `Example ${i + 1}`
    lines.push('')
    lines.push(`**${label}**`)
    lines.push('')
    lines.push('```ts')
    lines.push(example.code)
    lines.push('```')
  }

  return lines.join('\n')
}

function renderTypes(types: TypeDefinition[]): string {
  if (types.length === 0) return ''

  const lines: string[] = ['## Types', '']

  for (const t of types) {
    lines.push(`### \`${t.name}\``)
    lines.push('')
    lines.push(`${sourceLink(t.relativeFilePath, t.line)}`)
    lines.push('')
    lines.push('```ts')
    lines.push(formatSignature(t.text))
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

/** @public */
export function renderDocs(parseResult: ParseResult): string {
  const { entries, types } = parseResult

  if (entries.length === 0) return ''

  const ordered = [...entries].sort((a, b) => {
    const aOrder = a.readmeConfig.order
    const bOrder = b.readmeConfig.order
    if (aOrder !== undefined && bOrder !== undefined) {
      if (aOrder !== bOrder) return aOrder < bOrder ? -1 : 1
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    }
    if (aOrder !== undefined) return -1
    if (bOrder !== undefined) return 1
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })

  const grouped = groupBySection(ordered)
  const docSections: string[] = []

  docSections.push(renderToc(types, grouped))

  for (const { section, entries: sectionEntries } of grouped) {
    const sectionLines: string[] = [`## ${section}`, '']
    for (const entry of sectionEntries) {
      sectionLines.push(renderEntry(entry, parseResult))
      sectionLines.push('')
    }
    docSections.push(sectionLines.join('\n'))
  }

  const typesSection = renderTypes(types)
  if (typesSection) docSections.push(typesSection)

  return docSections.join('\n\n')
}
