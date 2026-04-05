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
})
