#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve, join } from 'node:path'
import fg from 'fast-glob'
import { parsePublicApi } from './parse'
import { renderDocs } from './render'
import { parseTodos, renderTodos } from './todos'

type Config = {
  templatePath: string
  outputPath: string
  todoOutputPath: string
  include: string[]
  ignore: string[]
}

const cwd = process.cwd()

const defaults: Config = {
  templatePath: join(cwd, '.README.md'),
  outputPath: join(cwd, 'README.md'),
  todoOutputPath: join(cwd, 'TODO.md'),
  include: ['src/**/*.{ts,tsx,js,jsx}'],
  ignore: ['**/*.spec.*', '**/*.test.*', '**/*.d.ts', '**/__fixtures__/**'],
}

const writeTodos = process.argv.includes('--todo')

async function main() {
  let config = defaults

  const configPath = join(cwd, 'readme.config.js')
  if (existsSync(configPath)) {
    const mod = await import(configPath)
    const exported = mod.default ?? mod
    config =
      typeof exported === 'function'
        ? exported(defaults)
        : { ...defaults, ...exported }
  }

  if (!existsSync(config.templatePath)) {
    console.error('No .README.md template found in', cwd)
    process.exit(1)
  }

  const template = readFileSync(config.templatePath, 'utf8')

  const files = await fg(config.include, {
    cwd,
    absolute: true,
    ignore: config.ignore,
  })

  const result = parsePublicApi(files.map((f) => resolve(f)))
  const docs = renderDocs(result)

  const output = docs ? `${template.trimEnd()}\n\n${docs}` : template

  writeFileSync(config.outputPath, output)
  console.log(
    `README.md written (${result.entries.length} public entries, ${result.types.length} types)`,
  )

  if (writeTodos) {
    const todos = parseTodos(files.map((f) => resolve(f)))

    if (todos.length > 0) {
      writeFileSync(config.todoOutputPath, renderTodos(todos))

      console.log(
        `TODO.md written (${todos.length} item${todos.length === 1 ? '' : 's'})`,
      )
    } else {
      try {
        unlinkSync(config.todoOutputPath)
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
      }

      console.log(`No TODOs found, removed TODO.md file`)
    }
  }
}

main()
