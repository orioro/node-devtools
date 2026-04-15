# create-orioro

Scaffold a new project from an orioro template.

## Usage

```bash
npm create orioro@latest
# or
yarn create orioro
# or
npx create-orioro
```

You will be prompted to choose a project directory and a template.

### Non-interactive

Pass the directory and template flags to skip prompts:

```bash
yarn create my-project --template ts
```

## Templates

| Template         | Description             |
| ---------------- | ----------------------- |
| `ts`             | TypeScript library      |
| `react`          | React component library |
| `workspaces`     | Monorepo workspaces     |
| `docker-compose` | Docker Compose setup    |

You can also pass any [degit](https://github.com/Rich-Harris/degit)-compatible path or git URL as the `--template` (or `-t`) value:

```bash
yarn create my-project --template user/repo
yarn create my-project --template user/repo/subdir
yarn create my-project --template https://github.com/user/repo
```

## Options

```
Arguments:
  [project-dir]           Directory to scaffold the project into

Options:
  -t, --template <name>   Template to use (ts, react, workspaces, docker-compose, or a custom degit path)
  -h, --help              Display help
```

## What it does

1. Clones the selected template into the target directory using degit (no git history)
2. Renames the `name` field in `package.json` to match the directory name
