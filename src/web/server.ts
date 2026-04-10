/**
 * HTTP server for the Constellation web UI.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import {
  handleGetTechnologies,
  handleGetCategories,
  handleValidate,
  handleGenerate,
  handleCreateBlueprint,
  handleSearchOnline,
  handleAddTechnology,
  handleGetHomeDir,
  handleGetGithubOrgs,
  handleGetGithubRepos,
} from './api.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');

// ─── MIME Types ───────────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// ─── Helpers ──────────────────────────────────────────────────────

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function corsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function serveStatic(res: ServerResponse, filePath: string): Promise<void> {
  try {
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// ─── Server ───────────────────────────────────────────────────────

export function startServer(port: number): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    corsHeaders(res);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // API routes
      if (pathname === '/api/technologies' && method === 'GET') {
        handleGetTechnologies(res);
        return;
      }

      if (pathname === '/api/categories' && method === 'GET') {
        handleGetCategories(res);
        return;
      }

      if (pathname === '/api/home-dir' && method === 'GET') {
        handleGetHomeDir(res);
        return;
      }

      if (pathname === '/api/github/orgs' && method === 'GET') {
        handleGetGithubOrgs(res);
        return;
      }

      if (pathname === '/api/github/repos' && method === 'GET') {
        const org = url.searchParams.get('org') || '';
        const q = url.searchParams.get('q') || '';
        handleGetGithubRepos(org, q, res);
        return;
      }

      if (pathname === '/api/search-online' && method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const ecosystem = url.searchParams.get('ecosystem') || 'npm';
        await handleSearchOnline(q, ecosystem, res);
        return;
      }

      if (pathname === '/api/add-technology' && method === 'POST') {
        const body = await parseBody(req);
        handleAddTechnology(body, res);
        return;
      }

      if (pathname === '/api/validate' && method === 'POST') {
        const body = await parseBody(req);
        await handleValidate(body, res);
        return;
      }

      if (pathname === '/api/generate' && method === 'POST') {
        const body = await parseBody(req);
        await handleGenerate(body, res);
        return;
      }

      if (pathname === '/api/blueprint' && method === 'POST') {
        const body = await parseBody(req);
        await handleCreateBlueprint(body, res);
        return;
      }

      // Static file serving
      const filePath = pathname === '/'
        ? join(PUBLIC_DIR, 'index.html')
        : join(PUBLIC_DIR, pathname);

      // Prevent directory traversal
      if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      await serveStatic(res, filePath);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }));
    }
  });

  server.listen(port, () => {
    console.log();
    console.log(chalk.bold('  Constellation Web UI'));
    console.log(chalk.dim('  ────────────────────'));
    console.log(`  ${chalk.green('●')} Server running at ${chalk.cyan(`http://localhost:${port}`)}`);
    console.log();
    console.log(chalk.dim('  Press Ctrl+C to stop.'));
    console.log();
  });
}
