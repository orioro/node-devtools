# claude-container

Docker image for running [Claude Code](https://github.com/anthropics/claude-code) in an isolated, firewalled container environment.

Based on the official Anthropic devcontainer setup:
- https://github.com/anthropics/claude-code/tree/main/.devcontainer
- Permalink (2026-04-05): https://github.com/anthropics/claude-code/tree/b543a256248ce5ff98804b8dfef4cd6247423d98/.devcontainer

## What it includes

- Node.js 20 (base image)
- Claude Code CLI (`@anthropic-ai/claude-code`)
- Zsh + Powerlevel10k theme
- Common dev tools: `git`, `gh`, `fzf`, `vim`, `nano`, `jq`, `curl`
- Firewall script (`init-firewall.sh`) that restricts outbound network access to a strict allowlist

## Firewall

The image includes a firewall script that uses `iptables` and `ipset` to restrict Claude Code's network access to only what it needs:

- `api.anthropic.com` — Claude API
- GitHub IP ranges — fetched live from `api.github.com/meta`
- `registry.npmjs.org` — npm
- `sentry.io`, `statsig.anthropic.com` — telemetry
- VS Code marketplace

All other outbound traffic is blocked.

The script must be applied at container start — not at build time — since `iptables` rules live in the network namespace and are reset on every container restart.

## Usage

See [template-docker-compose](../template-docker-compose) for a ready-to-use Docker Compose setup.

## Authentication

Claude Code supports two authentication methods:

**Option A — `claude login` (claude.ai Pro or free account):**
```bash
docker exec -it $(docker ps -q --filter name=claude-code) zsh
claude login
```
Credentials are stored in `~/.claude` and `~/.claude.json` inside the container. Mount these from the host to persist across restarts.

**Option B — API key:**
```bash
# in your .env file
ANTHROPIC_API_KEY=sk-ant-...
```
```yaml
# in docker-compose.yml
environment:
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

## Image

```
ghcr.io/orioro/claude-container:latest
```
