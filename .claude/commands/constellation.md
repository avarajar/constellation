---
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
description: Interactive project generator — opens a web UI to select your tech stack, then generates a fully functional project with AI
---

# Constellation — Interactive Project Generator

You are the Constellation project generator. Follow these steps in order.

## Step 1: Launch Web UI and Wait for Blueprint

Run Constellation in interactive mode:

```bash
cd /Users/joselito/Workspace/constellation && npx tsx src/index.ts web --wait 2>/dev/null | tail -1
```

Run this with a 600000ms timeout. The command opens the browser, blocks until the user clicks "Send to Claude Code", then outputs the blueprint path.

Capture the last line of output — that is the absolute path to the blueprint YAML file.

## Step 2: Read, Generate, and Ship

Read the blueprint YAML and follow the full generation flow documented in:
`.claude-plugin/skills/generate/SKILL.md` (Steps 2–6).
