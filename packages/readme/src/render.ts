import synchronizedPrettier from '@prettier/sync'
import { dirname, relative } from 'node:path'
import { packageUpSync } from 'package-up'
import type { PublicEntry, TypeDefinition, ParseResult } from './parse.js'

function sourceLink(relativeFilePath: string, line: number): string {
  return `[${relativeFilePath}#L${line}](${relativeFilePath}#L${line})`
}

const ARRAY_TYPE_NOTATION_RE = /\[\]$/

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

const DEFAULT_CATEGORY = 'General'

function _groupBy(
  items: PublicEntry[],
  getKey: (item: PublicEntry) => string,
): Record<string, PublicEntry[]> {
  const result: Record<string, PublicEntry[]> = {}
  for (const item of items) {
    const key = getKey(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}

function groupBySection(
  entries: PublicEntry[],
): { label: string; entries: PublicEntry[] }[] {
  const map = _groupBy(
    entries,
    (e) => e.readmeConfig.kind ?? BUILTIN_SECTION_MAP[e.kind] ?? 'Functions',
  )
  const custom = Object.keys(map).filter((k) => !BUILTIN_SECTIONS.includes(k))
  const builtin = BUILTIN_SECTIONS.filter((k) => map[k])
  return [...custom, ...builtin].map((label) => ({
    label,
    entries: map[label],
  }))
}

function groupByCategory(
  entries: PublicEntry[],
): { label: string; sections: { label: string; entries: PublicEntry[] }[] }[] {
  const withDefaults = entries.map((e) => ({
    ...e,
    readmeConfig: {
      ...e.readmeConfig,
      category: e.readmeConfig.category ?? DEFAULT_CATEGORY,
    },
  }))
  const map = _groupBy(withDefaults, (e) => e.readmeConfig.category!)
  const named = Object.keys(map)
    .filter((k) => k !== DEFAULT_CATEGORY)
    .sort()
  const keys = map[DEFAULT_CATEGORY] ? [...named, DEFAULT_CATEGORY] : named
  return keys.map((label) => ({ label, sections: groupBySection(map[label]) }))
}

function renderToc(
  types: TypeDefinition[],
  groups: { label: string; entries: PublicEntry[] }[],
): string {
  const lines: string[] = ['## API', '']

  for (const { label, entries } of groups) {
    lines.push(
      `**${label}:** ` +
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

function renderEntry(
  entry: PublicEntry,
  { types }: ParseResult,
  pkgRoot: string,
  headingLevel = 3,
): string {
  const lines: string[] = []
  const definedTypeNames = types.map((t) => t.name)
  const h = '#'.repeat(headingLevel)

  lines.push(`${h} \`${entry.name}\``)
  lines.push('')
  lines.push(`${sourceLink(relative(pkgRoot, entry.filePath), entry.line)}`)
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

    const typeText = definedTypeNames.includes(
      entry.returnType.replace(ARRAY_TYPE_NOTATION_RE, ''),
    )
      ? `[\`${entry.returnType}\`](#${toAnchor(entry.returnType)})`
      : `\`${entry.returnType}\``

    lines.push(`**Returns** ${typeText}${desc}`)
  }
  entry.examples.forEach((example, i) => {
    const label = example.name ? `Example: ${example.name}` : `Example ${i + 1}`

    lines.push('')
    lines.push(`**${label}**`)
    lines.push('')
    lines.push('```ts')
    lines.push(example.code)
    lines.push('```')
  })

  return lines.join('\n')
}

function buildTypeUsageIndex(
  entries: PublicEntry[],
  types: TypeDefinition[],
): Record<string, string[]> {
  const definedTypeNames = new Set(types.map((t) => t.name))
  const index: Record<string, string[]> = {}

  function addUsage(typeName: string, usedBy: string) {
    if (!index[typeName]) index[typeName] = []
    if (!index[typeName].includes(usedBy)) index[typeName].push(usedBy)
  }

  for (const entry of entries) {
    for (const param of entry.params) {
      const base = param.type.replace(ARRAY_TYPE_NOTATION_RE, '')
      if (definedTypeNames.has(base)) addUsage(base, entry.name)
    }
    if (entry.returnType) {
      const base = entry.returnType.replace(ARRAY_TYPE_NOTATION_RE, '')
      if (definedTypeNames.has(base)) addUsage(base, entry.name)
    }
  }

  for (const type of types) {
    for (const ref of type.references) {
      if (definedTypeNames.has(ref)) addUsage(ref, type.name)
    }
  }

  return index
}

function renderTypes(
  types: TypeDefinition[],
  usageIndex: Record<string, string[]>,
  pkgRoot: string,
): string {
  if (types.length === 0) return ''

  const lines: string[] = ['## Types', '']

  for (const t of types) {
    lines.push(`### \`${t.name}\``)
    lines.push('')
    lines.push(`${sourceLink(relative(pkgRoot, t.filePath), t.line)}`)
    lines.push('')
    lines.push('```ts')
    lines.push(formatSignature(t.text))
    lines.push('```')

    const usedBy = usageIndex[t.name]
    if (usedBy && usedBy.length > 0) {
      lines.push('')
      lines.push(
        `**Used by:** ${usedBy.map((n) => `[\`${n}\`](#${toAnchor(n)})`).join(', ')}`,
      )
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Renders a `ParseResult` into a markdown string. Entries are grouped into
 * sections by kind (`Functions`, `Classes`, `Constants`) and optionally into
 * top-level categories via `@readme category=`. Within each group, entries are
 * sorted by `@readme order=` first, then alphabetically.
 * @param parseResult - the result of `parsePublicApi`
 * @returns markdown string ready to be appended to a README template
 *
 * @example <caption>Render and write README</caption>
 * import { parsePublicApi, renderDocs } from '@orioro/readme'
 * import { readFileSync, writeFileSync } from 'node:fs'
 *
 * const result = parsePublicApi(files)
 * const docs = renderDocs(result)
 * const template = readFileSync('.README.md', 'utf8')
 * writeFileSync('README.md', `${template.trimEnd()}\n\n${docs}`)
 *
 * @example <caption>Filter entries before rendering</caption>
 * const result = parsePublicApi(files)
 *
 * // Only document functions, skip constants
 * result.entries = result.entries.filter((e) => e.kind === 'function')
 *
 * const docs = renderDocs(result)
 * @readme category=Render
 * @public
 */
export function renderDocs(parseResult: ParseResult): string {
  const { entries, types } = parseResult

  if (entries.length === 0) return ''

  const firstFilePath = entries[0]?.filePath ?? types[0]?.filePath
  const pkgPath = firstFilePath
    ? packageUpSync({ cwd: dirname(firstFilePath) })
    : undefined
  const pkgRoot = pkgPath ? dirname(pkgPath) : process.cwd()

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

  const hasCategories = ordered.some((e) => e.readmeConfig.category)
  const docSections: string[] = []

  if (hasCategories) {
    const categories = groupByCategory(ordered)
    const tocGroups = categories.map(({ label, sections }) => ({
      label,
      entries: sections.reduce(
        (acc: PublicEntry[], s) => acc.concat(s.entries),
        [],
      ),
    }))
    docSections.push(renderToc(types, tocGroups))

    for (const { label: category, sections } of categories) {
      const categoryLines: string[] = [`## ${category}`, '']

      const catHasMultipleTypes = Object.keys(sections).length > 1

      for (const { label: section, entries: sectionEntries } of sections) {
        categoryLines.push(
          ...(catHasMultipleTypes ? [`### ${section}`, ''] : ['']),
        )
        for (const entry of sectionEntries) {
          categoryLines.push(renderEntry(entry, parseResult, pkgRoot, 4))
          categoryLines.push('')
        }
      }
      docSections.push(categoryLines.join('\n'))
    }
  } else {
    const grouped = groupBySection(ordered)
    docSections.push(renderToc(types, grouped))

    for (const { label, entries: sectionEntries } of grouped) {
      const sectionLines: string[] = [`## ${label}`, '']
      for (const entry of sectionEntries) {
        sectionLines.push(renderEntry(entry, parseResult, pkgRoot))
        sectionLines.push('')
      }
      docSections.push(sectionLines.join('\n'))
    }
  }

  const usageIndex = buildTypeUsageIndex(ordered, types)
  const typesSection = renderTypes(types, usageIndex, pkgRoot)
  if (typesSection) docSections.push(typesSection)

  return docSections.join('\n\n')
}
