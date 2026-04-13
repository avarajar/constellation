---
description: Open the visual web UI to select your tech stack, then generate a fully functional project with AI
---

# Constellation — Interactive Project Generator

You are the Constellation project generator. Follow these steps in order.

## Step 1: Launch Web UI and Wait for Blueprint

Run Constellation in interactive mode. This opens the web UI and blocks until the user finishes configuring their stack.

```bash
npx @avarajar/constellation@latest web --wait 2>/dev/null | tail -1
```

Run this with a 600000ms timeout. The command:
1. Starts the web server at http://localhost:3210
2. Opens the browser automatically
3. Blocks until the user clicks "Send to Claude Code"
4. Outputs the blueprint file path as the last line of stdout
5. Shuts down the server

Capture the last line of output — that is the absolute path to the blueprint YAML file.

## Step 2: Read and Parse the Blueprint

Read the blueprint YAML file from the path captured in Step 1.

Parse and understand every section:
- `project.name`, `project.description`, `project.outputDir`
- `stack.frontend`, `stack.backend`, `stack.database`
- `stack.infrastructure`, `stack.testing`, `stack.monitoring`
- `generation.crudEntity`, `generation.crudFields`, `generation.features`
- `generation.docker`, `generation.ci`
- `github.mode`, `github.org`, `github.repoName`, `github.existingRepo`

Summarize the blueprint briefly, then proceed immediately to generation.

## Step 3: Generate the Project

Create the project directory:
```bash
mkdir -p <outputDir>
```

For each non-null stack section, spawn a sub-agent using the corresponding Constellation skill. **Run all applicable agents in parallel.**

| Blueprint section | Skill to invoke | Condition |
|---|---|---|
| `stack.frontend` | `constellation:frontend` | `stack.frontend.framework` is not null |
| `stack.backend` | `constellation:backend` | `stack.backend.framework` is not null |
| `stack.database` | `constellation:database` | `stack.database.primary` is not null |
| `stack.infrastructure` | `constellation:infrastructure` | containerization or cicd is not null |
| `stack.testing` | `constellation:testing` | any testing tool is not null |
| `stack.monitoring` | `constellation:monitoring` | any monitoring tool is not null |
| (always) | `constellation:common` | always spawn |

**Pass the full blueprint YAML text to each sub-agent.** Each skill has a MANDATORY "Step 0" that fetches latest package versions via npm/pip/curl before writing any code. This ensures all generated dependencies use current versions, not outdated training data.

## Step 4: Verify

After all agents complete:
- Check that key files exist (package.json or equivalent entry points, main source files)
- **Spot-check dependency versions**: pick 2-3 packages from requirements.txt or package.json and run `npm view <pkg> version` or `curl -s https://pypi.org/pypi/<pkg>/json | python3 -c "import sys,json; print(json.load(sys.stdin)['info']['version'])"` to confirm they match current latest. If they don't match, fix them.
- If TypeScript, attempt `npx tsc --noEmit` in relevant directories
- Verify `make dev` or `scripts/dev.sh` exists and the project can start locally
- Fix any issues found
- Report a brief summary of what was generated

## Step 5: Git + GitHub

Read the `github` section from the blueprint.

If `github.mode` is **"new"**:
```bash
cd <outputDir>
git init
git add -A
git commit -m "Initial project scaffolding via Constellation"
```
Then ask the user if they want the repo **public or private**, and create it:
```bash
gh repo create <org-or-user>/<repoName> --source . --push --private
```

If `github.mode` is **"existing"**:
```bash
cd <outputDir>
git add -A
git commit -m "Add Constellation-generated project scaffolding"
git push
```

If `github.mode` is **"none"**: skip this step.

Report the repo URL if applicable.

## Step 6: Final Summary

Show the user:

> **Project generated successfully!**
>
> - **Name:** (project name)
> - **Path:** (output directory)
> - **Repo:** (repo URL or "local only")
> - **Stack:** (brief summary with versions)
>
> **Quick start:**
> ```bash
> cd <outputDir>
> make setup   # Install deps, create .env, run migrations, seed data
> make dev     # Start all services locally
> ```
