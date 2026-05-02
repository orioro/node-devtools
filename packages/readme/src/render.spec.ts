import { resolve } from 'node:path'
import { parsePublicApi } from './parse'
import { renderDocs } from './render'

const fixture = (name: string) =>
  resolve(__dirname, '__fixtures__', `${name}.ts`)

describe('renderDocs', () => {
  test('renders empty string when no entries', () => {
    expect(renderDocs({ entries: [], types: [] })).toBe('')
  })

  test('renders basic function', () => {
    expect(renderDocs(parsePublicApi([fixture('basic')]))).toMatchSnapshot()
  })

  test('renders complex types, arrow functions, and classes', () => {
    expect(renderDocs(parsePublicApi([fixture('complex')]))).toMatchSnapshot()
  })

  test('renders constants with inferred and annotated types', () => {
    expect(renderDocs(parsePublicApi([fixture('constants')]))).toMatchSnapshot()
  })

  test('renders callable constants as functions with params and return type', () => {
    expect(
      renderDocs(parsePublicApi([fixture('callable_constants')])),
    ).toMatchSnapshot()
  })

  test('callable constant renders function signature, not const signature', () => {
    const rendered = renderDocs(parsePublicApi([fixture('callable_constants')]))
    expect(rendered).toContain('function validate(')
    expect(rendered).not.toContain('const validate:')
  })

  test('callable constant renders param table row', () => {
    const rendered = renderDocs(parsePublicApi([fixture('callable_constants')]))
    expect(rendered).toContain('value')
  })

  test('renders type definitions section before API for locally-defined types', () => {
    expect(renderDocs(parsePublicApi([fixture('typed')]))).toMatchSnapshot()
  })

  describe('categories', () => {
    test('renders a ## heading for each category', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      expect(rendered).toContain('## Auth')
      expect(rendered).toContain('## Utility')
      expect(rendered).toContain('## General')
    })

    test('categories are sorted alphabetically with General last', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      const authPos = rendered.indexOf('## Auth')
      const utilityPos = rendered.indexOf('## Utility')
      const generalPos = rendered.indexOf('## General')
      expect(authPos).toBeLessThan(utilityPos)
      expect(utilityPos).toBeLessThan(generalPos)
    })

    test('renders section sub-headings within each category', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      const authSection = rendered.slice(
        rendered.indexOf('## Auth'),
        rendered.indexOf('## Utility'),
      )
      expect(authSection).toContain('### Functions')
      expect(authSection).toContain('### Components')
    })

    test('entry headings are #### when categories are in use', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      expect(rendered).toContain('#### `login`')
      expect(rendered).toContain('#### `logout`')
      expect(rendered).toContain('#### `noop`')
    })

    test('custom kind=Components groups entry under Components section', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      const authSection = rendered.slice(
        rendered.indexOf('## Auth'),
        rendered.indexOf('## Utility'),
      )
      const componentsSection = authSection.slice(
        authSection.indexOf('### Components'),
      )
      expect(componentsSection).toContain('#### `Button`')
    })

    test('uncategorized entries fall into General', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      const generalSection = rendered.slice(rendered.indexOf('## General'))
      expect(generalSection).toContain('#### `noop`')
    })

    test('TOC lists entries grouped by category', () => {
      const rendered = renderDocs(parsePublicApi([fixture('categories')]))
      const toc = rendered.slice(0, rendered.indexOf('## Auth'))
      expect(toc).toContain('**Auth:**')
      expect(toc).toContain('**Utility:**')
      expect(toc).toContain('**General:**')
    })
  })

  describe('ordering', () => {
    const getOrder = (rendered: string) =>
      [...rendered.matchAll(/### `(\w+)`/g)].map((m) => m[1])

    test('ordered entries appear before unordered entries', () => {
      const rendered = renderDocs(parsePublicApi([fixture('ordering')]))
      const names = getOrder(rendered)
      const lastOrdered = names.indexOf('second') // order=2, last of ordered group
      const firstUnordered = names.indexOf('alpha') // first alphabetically of unordered
      expect(lastOrdered).toBeLessThan(firstUnordered)
    })

    test('ordered entries are sorted by order value', () => {
      const rendered = renderDocs(parsePublicApi([fixture('ordering')]))
      const names = getOrder(rendered)
      expect(names.indexOf('first')).toBeLessThan(names.indexOf('second'))
    })

    test('ties in order value are broken alphabetically', () => {
      const rendered = renderDocs(parsePublicApi([fixture('ordering')]))
      const names = getOrder(rendered)
      expect(names.indexOf('also')).toBeLessThan(names.indexOf('second'))
    })

    test('unordered entries are sorted alphabetically', () => {
      const rendered = renderDocs(parsePublicApi([fixture('ordering')]))
      const names = getOrder(rendered)
      expect(names.indexOf('alpha')).toBeLessThan(names.indexOf('zebra'))
    })
  })

  describe('@signature tag rendering', () => {
    test('renders the custom signature string in code block', () => {
      const rendered = renderDocs(parsePublicApi([fixture('signature_tag')]))
      expect(rendered).toMatchSnapshot()
      expect(rendered).toContain(
        'function nodeIdArray(state: NodeState): NodeId[]',
      )
    })

    test('renders param table rows from signature-parsed params', () => {
      const rendered = renderDocs(parsePublicApi([fixture('signature_tag')]))
      expect(rendered).toContain('state')
      expect(rendered).toContain('NodeState')
    })

    test('renders param descriptions from @param tags', () => {
      const rendered = renderDocs(parsePublicApi([fixture('signature_tag')]))
      expect(rendered).toContain('tree state')
    })

    test('renders type definitions for types referenced in signature', () => {
      const rendered = renderDocs(parsePublicApi([fixture('signature_tag')]))
      expect(rendered).toContain('NodeState')
      expect(rendered).toContain('NodeId')
    })

    test('does not render the wrapper type (QueryProvider) in output', () => {
      const rendered = renderDocs(parsePublicApi([fixture('signature_tag')]))
      expect(rendered).not.toContain('QueryProvider')
    })
  })

  describe('examples', () => {
    test('renders multiple examples each wrapped in a ts code block', () => {
      const rendered = renderDocs(parsePublicApi([fixture('examples')]))
      const exampleBlocks =
        rendered.match(/\*\*Example[^*]*\*\*\n\n```ts[\s\S]*?```/g) ?? []
      expect(exampleBlocks).toHaveLength(2)

      expect(rendered).toMatchSnapshot()
    })

    test('uses example name in label when provided, falls back to number', () => {
      const rendered = renderDocs(parsePublicApi([fixture('examples')]))
      expect(rendered).toContain('**Example: Basic usage**')
      expect(rendered).toContain('**Example 2**')
    })

    test('preserves multi-line content within each example block', () => {
      const rendered = renderDocs(parsePublicApi([fixture('examples')]))
      const exampleBlocks =
        rendered.match(/\*\*Example[^*]*\*\*\n\n```ts[\s\S]*?```/g) ?? []
      expect(exampleBlocks[0]).toContain('The answer is {0}')
      expect(exampleBlocks[0]).toContain('Flag is {0}')
      expect(exampleBlocks[1]).toContain('greet(')

      expect(rendered).toMatchSnapshot()
    })
  })
})
