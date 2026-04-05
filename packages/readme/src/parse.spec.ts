import { resolve } from 'node:path'
import { parsePublicApi } from './parse'

const fixture = (name: string) =>
  resolve(__dirname, '__fixtures__', `${name}.ts`)

const normalize = ({ entries, types }: ReturnType<typeof parsePublicApi>) => ({
  types,
  entries: entries.map(({ filePath: _, ...rest }) => rest),
})

describe('parsePublicApi', () => {
  test('picks up @public functions and ignores the rest', () => {
    expect(normalize(parsePublicApi([fixture('basic')]))).toMatchSnapshot()
  })

  test('resolves complex return types and optional params', () => {
    expect(normalize(parsePublicApi([fixture('complex')]))).toMatchSnapshot()
  })

  test('collects referenced local type definitions in dependency order', () => {
    expect(normalize(parsePublicApi([fixture('typed')]))).toMatchSnapshot()
  })

  test('infers constant types, including from explicit annotations', () => {
    expect(normalize(parsePublicApi([fixture('constants')]))).toMatchSnapshot()
  })

  test('non-@public functions are not included', () => {
    const { entries } = parsePublicApi([fixture('basic')])
    expect(entries.find((e) => e.name === 'internal')).toBeUndefined()
  })
})
