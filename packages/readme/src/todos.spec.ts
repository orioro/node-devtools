import { resolve } from 'node:path'
import { parseTodos, renderTodos } from './todos'

const fixture = resolve(__dirname, '__fixtures__', 'todos_fixture.ts')

describe('parseTodos', () => {
  test('parses single-line inline // TODO:', () => {
    const todos = parseTodos([fixture])
    const todo = todos.find((t) => t.text === 'single line inline todo')
    expect(todo).toBeDefined()
    expect(todo!.line).toBe(1)
  })

  test('captures multi-line inline // TODO: with consecutive // continuations', () => {
    const todos = parseTodos([fixture])
    const todo = todos.find((t) => t.text.startsWith('multi-line inline todo'))
    expect(todo).toBeDefined()
    expect(todo!.text).toBe('multi-line inline todo continues here and here')
  })

  test('parses single-line block /* TODO: */', () => {
    const todos = parseTodos([fixture])
    const todo = todos.find((t) => t.text === 'single line block comment')
    expect(todo).toBeDefined()
  })

  test('captures multi-line block comment until */', () => {
    const todos = parseTodos([fixture])
    const todo = todos.find((t) =>
      t.text.startsWith('multi-line block comment'),
    )
    expect(todo).toBeDefined()
    expect(todo!.text).toBe('multi-line block comment continues here and here')
  })

  test('parses single-line @todo JSDoc tag', () => {
    const todos = parseTodos([fixture])
    const todo = todos.find((t) => t.text === 'single line jsdoc todo')
    expect(todo).toBeDefined()
  })

  test('captures multi-line @todo until next @tag', () => {
    const todos = parseTodos([fixture])
    const todo = todos.find((t) => t.text.startsWith('multi-line jsdoc todo'))
    expect(todo).toBeDefined()
    expect(todo!.text).toBe('multi-line jsdoc todo continues here and here')
  })

  describe('[readme-ignore]', () => {
    test('skips inline // TODO: with [readme-ignore] marker', () => {
      const todos = parseTodos([fixture])
      expect(
        todos.find((t) => t.text.includes('this should be ignored')),
      ).toBeUndefined()
    })

    test('skips block /* TODO: */ with [readme-ignore] marker', () => {
      const todos = parseTodos([fixture])
      expect(
        todos.find((t) => t.text.includes('this block should be ignored')),
      ).toBeUndefined()
    })

    test('skips @todo tag with [readme-ignore] marker', () => {
      const todos = parseTodos([fixture])
      expect(
        todos.find((t) => t.text.includes('this jsdoc todo should be ignored')),
      ).toBeUndefined()
    })
  })

  test('returns relativeFilePath for each entry', () => {
    const todos = parseTodos([fixture])
    expect(
      todos.every((t) => t.relativeFilePath.endsWith('todos_fixture.ts')),
    ).toBe(true)
  })
})

describe('renderTodos', () => {
  test('renders "" when list is empty', () => {
    expect(renderTodos([])).toContain('')
  })

  test('renders a # TODO heading', () => {
    const todos = parseTodos([fixture])
    expect(renderTodos(todos)).toMatch(/^# TODO/)
  })

  test('groups entries under a ## file heading', () => {
    const todos = parseTodos([fixture])
    const rendered = renderTodos(todos)
    expect(rendered).toContain('## src/__fixtures__/todos_fixture.ts')
  })

  test('renders each entry as a markdown checkbox with source link', () => {
    const todos = parseTodos([fixture])
    const rendered = renderTodos(todos)
    expect(rendered).toMatch(/- \[ \] .+ \(\[.+#L\d+\]\(.+#L\d+\)\)/)
  })
})
