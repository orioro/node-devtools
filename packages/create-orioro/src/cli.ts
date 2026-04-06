#!/usr/bin/env node
import { resolve } from 'node:path'
import { Command } from 'commander'
import * as prompts from '@clack/prompts'
import { scaffold } from './index.js'

// Branch where templates live — update once merged to main
const TEMPLATE_BRANCH = 'main'

const GITHUB_REPO = 'orioro/node-devtools'

// degit requires short-form paths (user/repo/subdir) for subdirectory cloning;
// full https URLs do not support the subdir syntax
const TEMPLATES: Record<string, { label: string; src: string; url?: string }> =
  {
    ts: {
      label: 'TypeScript library (ts)',
      src: `${GITHUB_REPO}/packages/template-ts#${TEMPLATE_BRANCH}`,
    },
    react: {
      label: 'React component library (react)',
      src: `${GITHUB_REPO}/packages/template-react#${TEMPLATE_BRANCH}`,
    },
    workspaces: {
      label: 'Monorepo workspaces (workspaces)',
      src: `${GITHUB_REPO}/packages/template-workspaces#${TEMPLATE_BRANCH}`,
    },
    'docker-compose': {
      label: 'Docker compose (docker-compose)',
      src: `${GITHUB_REPO}/packages/template-docker-compose#${TEMPLATE_BRANCH}`,
    },
  }

function resolveTemplateSrc(template: string): string {
  return TEMPLATES[template]?.src ?? template
}

const program = new Command()

program
  .name('create-orioro')
  .description('Scaffold a new project from an orioro template')
  .argument('[project-dir]', 'Directory to scaffold the project into')
  .option(
    '-t, --template <template>',
    'Template to use: ts, react, workspaces, or a custom degit path',
  )
  .action(
    async (
      projectDirArg: string | undefined,
      options: { template?: string },
    ) => {
      prompts.intro('create-orioro')

      // Resolve project directory
      const projectDir =
        projectDirArg ||
        (await prompts.text({
          message: 'Project directory',
          placeholder: 'my-project',
          validate: (v) => (!v ? 'Please enter a directory name' : undefined),
        }))

      if (prompts.isCancel(projectDir)) {
        prompts.cancel('Cancelled')
        process.exit(0)
      }

      // Resolve template URL
      const templateUrl = await (async () => {
        if (options.template) {
          return resolveTemplateSrc(options.template)
        }

        const selected = await prompts.select({
          message: 'Select a template',
          options: [
            ...Object.entries(TEMPLATES).map(([id, { label, url }]) => ({
              value: id,
              label: `${label}`,
            })),
            { value: 'other', label: 'Other (custom degit path / git URL)' },
          ],
        })

        if (prompts.isCancel(selected)) {
          prompts.cancel('Cancelled')
          process.exit(0)
        }

        if (selected !== 'other') {
          return resolveTemplateSrc(selected as string)
        }

        const custom = await prompts.text({
          message: 'Enter a degit path or git URL',
          placeholder: 'user/repo  or  user/repo/subdir  or  https://...',
          validate: (v) => (!v ? 'Please enter a path or URL' : undefined),
        })

        if (prompts.isCancel(custom)) {
          prompts.cancel('Cancelled')
          process.exit(0)
        }

        return custom
      })()

      const spinner = prompts.spinner()
      spinner.start(`Cloning ${templateUrl} → ${projectDir}`)

      const absProjectDir = resolve(projectDir)
      try {
        await scaffold(absProjectDir, templateUrl)
        spinner.stop('Done!')
        prompts.outro(`Project ready at ${absProjectDir}`)
        process.exit(0)
      } catch (err) {
        spinner.stop('Failed')
        prompts.cancel(err instanceof Error ? err.message : String(err))
        process.exit(1)
      }
    },
  )

program.parse()
