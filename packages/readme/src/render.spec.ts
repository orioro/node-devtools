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

  test('renders type definitions section before API for locally-defined types', () => {
    expect(renderDocs(parsePublicApi([fixture('typed')]))).toMatchSnapshot()
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
