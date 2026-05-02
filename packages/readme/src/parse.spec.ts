import { resolve } from 'node:path'
import { parsePublicApi } from './parse'

const fixture = (name: string) =>
  resolve(__dirname, '__fixtures__', `${name}.ts`)

const _omitFilePath = ({
  entries,
  types,
}: ReturnType<typeof parsePublicApi>) => ({
  types: types.map((item) => ({ ...item, filePath: 'omitted' })),
  entries: entries.map((item) => ({ ...item, filePath: 'omitted' })),
})

describe('parsePublicApi', () => {
  test('picks up @public functions and ignores the rest', () => {
    expect(_omitFilePath(parsePublicApi([fixture('basic')]))).toMatchSnapshot()
  })

  test('resolves complex return types and optional params', () => {
    expect(
      _omitFilePath(parsePublicApi([fixture('complex')])),
    ).toMatchSnapshot()
  })

  test('collects referenced local type definitions in dependency order', () => {
    expect(_omitFilePath(parsePublicApi([fixture('typed')]))).toMatchSnapshot()
  })

  test('infers constant types, including from explicit annotations', () => {
    expect(
      _omitFilePath(parsePublicApi([fixture('constants')])),
    ).toMatchSnapshot()
  })

  test('non-@public functions are not included', () => {
    const { entries } = parsePublicApi([fixture('basic')])
    expect(entries.find((e) => e.name === 'internal')).toBeUndefined()
  })

  test('does not blow up on recursive types like Jsonifiable from type-fest', () => {
    expect(() => parsePublicApi([fixture('jsonifiable')])).not.toThrow()
    const { entries } = parsePublicApi([fixture('jsonifiable')])
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('serialize')
  })

  describe('@name tag', () => {
    test('uses @name when present instead of the AST identifier', () => {
      const { entries } = parsePublicApi([fixture('jsdoc_name')])
      const fn = entries.find((e) => e.name === 'publicName')!
      expect(fn).toBeDefined()
      expect(fn.signature).toContain('publicName')
    })

    test('falls back to AST identifier when @name is absent', () => {
      const { entries } = parsePublicApi([fixture('jsdoc_name')])
      const fn = entries.find((e) => e.name === 'noAlias')!
      expect(fn).toBeDefined()
    })

    test('no entry exists under the original AST name when @name overrides it', () => {
      const { entries } = parsePublicApi([fixture('jsdoc_name')])
      expect(entries.find((e) => e.name === '_internalName')).toBeUndefined()
    })
  })

  describe('TypeDefinition.references', () => {
    test('type that references other local types lists them in references', () => {
      const { types } = parsePublicApi([fixture('typed')])
      const userProfile = types.find((t) => t.name === 'UserProfile')!
      expect(userProfile).toBeDefined()
      expect(userProfile.references).toContain('Status')
      expect(userProfile.references).toContain('Address')
    })

    test('leaf types with no local type references have empty references', () => {
      const { types } = parsePublicApi([fixture('typed')])
      const status = types.find((t) => t.name === 'Status')!
      expect(status).toBeDefined()
      expect(status.references).toEqual([])
    })

    test('array type notation UserProfile[] is still tracked as a reference to UserProfile', () => {
      const { types } = parsePublicApi([fixture('typed')])
      const userList = types.find((t) => t.name === 'UserList')!
      expect(userList).toBeDefined()
      expect(userList.references).toContain('UserProfile')
    })

    test('references contains no duplicates', () => {
      const { types } = parsePublicApi([fixture('typed')])
      const userProfile = types.find((t) => t.name === 'UserProfile')!
      const unique = new Set(userProfile.references)
      expect(userProfile.references.length).toBe(unique.size)
    })
  })

  describe('callable constants (factory-returned functions)', () => {
    test('constant with callable interface annotation extracted as function', () => {
      const { entries } = parsePublicApi([fixture('callable_constants')])
      const entry = entries.find((e) => e.name === 'validate')!
      expect(entry).toBeDefined()
      expect(entry.kind).toBe('function')
    })

    test('callable constant has correct params from call signature', () => {
      const { entries } = parsePublicApi([fixture('callable_constants')])
      const entry = entries.find((e) => e.name === 'validate')!
      expect(entry.params).toHaveLength(1)
      expect(entry.params[0].name).toBe('value')
    })

    test('callable constant has correct return type from call signature', () => {
      const { entries } = parsePublicApi([fixture('callable_constants')])
      const entry = entries.find((e) => e.name === 'validate')!
      expect(entry.returnType).toBe('ValidationResult')
    })

    test('callable constant signature is function-style not const-style', () => {
      const { entries } = parsePublicApi([fixture('callable_constants')])
      const entry = entries.find((e) => e.name === 'validate')!
      expect(entry.signature).toMatch(/^function validate\(/)
    })

    test('callable constant JSDoc description and return description are preserved', () => {
      const { entries } = parsePublicApi([fixture('callable_constants')])
      const entry = entries.find((e) => e.name === 'validate')!
      expect(entry.description).toContain('Validates a value')
      expect(entry.returnDescription).toContain('true when valid')
    })
  })

  describe('JSDoc type precedence over TypeScript types', () => {
    test('JSDoc @param {type} overrides TS-inferred param type', () => {
      const { entries } = parsePublicApi([fixture('jsdoc_types')])
      const fn = entries.find((e) => e.name === 'format')!
      expect(fn.params[0].type).toBe('any')
      expect(fn.params[1].type).toBe('FormatterOptions')
    })

    test('JSDoc @returns {type} overrides TS-inferred return type', () => {
      const { entries } = parsePublicApi([fixture('jsdoc_types')])
      const fn = entries.find((e) => e.name === 'format')!
      expect(fn.returnType).toBe('string')
      expect(fn.signature).toContain(': string')
    })

    test('falls back to TS-inferred type when JSDoc type is absent', () => {
      const { entries } = parsePublicApi([fixture('jsdoc_types')])
      const fn = entries.find((e) => e.name === 'score')!
      expect(fn.params[0].type).toBe('string')
      expect(fn.returnType).toBe('number')
    })
  })
})
