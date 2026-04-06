# orioro/node-devtools

Monorepo of developer tooling for orioro projects — scaffolding, build configs, README generation, and a Docker-based Claude Code environment.

## Packages

### Scaffolding

| Package | Description |
|---|---|
| [`create-orioro`](packages/create-orioro) | CLI to scaffold new projects from templates (`npm create orioro`) |

### Templates

| Package | Description |
|---|---|
| [`template-ts`](packages/template-ts) | TypeScript library starter |
| [`template-react`](packages/template-react) | React component library starter |
| [`template-workspaces`](packages/template-workspaces) | Monorepo workspaces starter |
| [`template-docker-compose`](packages/template-docker-compose) | Docker Compose setup with Claude Code + optional PostgreSQL |

### Dev tooling

| Package | Description |
|---|---|
| [`@orioro/dev`](packages/dev) | Shared Rollup, Babel, and Storybook configs |
| [`@orioro/readme`](packages/readme) | README generator — scans `@public` JSDoc tags and renders API docs |

### Infrastructure

| Package | Description |
|---|---|
| [`claude-container`](packages/claude-container) | Docker image for running Claude Code in a firewalled container |

## Repo commands

```bash
yarn build        # Build all packages in topological order
yarn publish      # Publish all public packages to npm
yarn changeset    # Create a changeset for versioning
```

## Requirements

- Node.js 20.x
- Yarn 4
