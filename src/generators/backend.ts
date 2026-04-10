/**
 * Backend project generator.
 * Handles all backend frameworks and languages: Express, Fastify, Hono, Elysia, NestJS,
 * Django, Flask, FastAPI, Starlette, Spring Boot, Quarkus, ASP.NET Core,
 * Go (Gin/Echo/Chi), Rust (Actix/Axum/Rocket).
 */
import type {
  Generator,
  GeneratorContext,
  GeneratorResult,
  GeneratedFile,
  PostGenCommand,
  TechCategory,
  SelectedTech,
} from '../core/types.js';

// ─── Helpers ───────────────────────────────────────────────────────

function hasTech(ctx: GeneratorContext, id: string): boolean {
  return ctx.selection.technologies.some((t) => t.id === id);
}

function getTech(ctx: GeneratorContext, category: TechCategory): SelectedTech | undefined {
  return ctx.selection.technologies.find((t) => t.category === category);
}

// ─── Node.js backends ──────────────────────────────────────────────

function isNodeBackend(ctx: GeneratorContext): boolean {
  return (
    hasTech(ctx, 'express') ||
    hasTech(ctx, 'fastify') ||
    hasTech(ctx, 'hono') ||
    hasTech(ctx, 'elysia') ||
    hasTech(ctx, 'nestjs')
  );
}

function nodePackageJson(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {
    typescript: '^5.7.3',
    '@types/node': '^22.13.5',
    tsx: '^4.19.3',
    tsup: '^8.4.0',
  };
  const scripts: Record<string, string> = {
    dev: 'tsx watch src/index.ts',
    build: 'tsup src/index.ts --format esm --dts --clean',
    start: 'node dist/index.js',
    typecheck: 'tsc --noEmit',
  };

  if (hasTech(ctx, 'express')) {
    deps['express'] = '^5.0.1';
    deps['cors'] = '^2.8.5';
    devDeps['@types/express'] = '^5.0.0';
    devDeps['@types/cors'] = '^2.8.17';
  }

  if (hasTech(ctx, 'fastify')) {
    deps['fastify'] = '^5.2.1';
    deps['@fastify/cors'] = '^11.0.1';
    deps['@fastify/sensible'] = '^6.0.3';
  }

  if (hasTech(ctx, 'hono')) {
    deps['hono'] = '^4.7.4';
    deps['@hono/node-server'] = '^1.13.8';
  }

  if (hasTech(ctx, 'elysia')) {
    deps['elysia'] = '^1.2.10';
    deps['@elysiajs/cors'] = '^1.1.6';
    scripts['dev'] = 'bun run --watch src/index.ts';
    scripts['build'] = 'bun build src/index.ts --outdir dist --target bun';
    scripts['start'] = 'bun dist/index.js';
  }

  if (hasTech(ctx, 'nestjs')) {
    deps['@nestjs/core'] = '^11.0.6';
    deps['@nestjs/common'] = '^11.0.6';
    deps['@nestjs/platform-express'] = '^11.0.6';
    deps['reflect-metadata'] = '^0.2.2';
    deps['rxjs'] = '^7.8.1';
    devDeps['@nestjs/cli'] = '^11.0.0';
    scripts['dev'] = 'nest start --watch';
    scripts['build'] = 'nest build';
    scripts['start'] = 'node dist/main.js';
  }

  if (hasTech(ctx, 'dotenv')) {
    deps['dotenv'] = '^16.4.7';
  }

  return JSON.stringify(
    {
      name: `${name}-backend`,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  );
}

function nodeTsConfig(ctx: GeneratorContext): string {
  const base: Record<string, unknown> = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ES2022'],
      outDir: 'dist',
      rootDir: 'src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      isolatedModules: true,
      ...(hasTech(ctx, 'nestjs') ? { emitDecoratorMetadata: true, experimentalDecorators: true } : {}),
    },
    include: ['src'],
    exclude: ['node_modules', 'dist'],
  };
  return JSON.stringify(base, null, 2);
}

// ─── Express entry point ───────────────────────────────────────────

function expressEntry(ctx: GeneratorContext): string {
  return `import express from 'express';
import cors from 'cors';
import { itemsRouter } from './routes/items.js';

const app = express();
const port = process.env['PORT'] ?? 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/items', itemsRouter);

app.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
});
`;
}

function expressRoutes(): string {
  return `import { Router } from 'express';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const items: Item[] = [];

export const itemsRouter = Router();

// List all items
itemsRouter.get('/', (_req, res) => {
  res.json(items);
});

// Get item by ID
itemsRouter.get('/:id', (req, res) => {
  const item = items.find((i) => i.id === req.params['id']);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// Create item
itemsRouter.post('/', (req, res) => {
  const { title } = req.body as { title: string };
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const item: Item = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  res.status(201).json(item);
});

// Update item
itemsRouter.put('/:id', (req, res) => {
  const item = items.find((i) => i.id === req.params['id']);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { title, completed } = req.body as { title?: string; completed?: boolean };
  if (title !== undefined) item.title = title;
  if (completed !== undefined) item.completed = completed;
  res.json(item);
});

// Delete item
itemsRouter.delete('/:id', (req, res) => {
  const index = items.findIndex((i) => i.id === req.params['id']);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });
  items.splice(index, 1);
  res.status(204).send();
});
`;
}

function expressCorsPlugin(): string {
  return `import cors from 'cors';

export const corsOptions: cors.CorsOptions = {
  origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
`;
}

// ─── Fastify entry point ───────────────────────────────────────────

function fastifyEntry(): string {
  return `import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { itemRoutes } from './routes/items.js';

const fastify = Fastify({ logger: true });

async function start() {
  await fastify.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  });
  await fastify.register(sensible);
  await fastify.register(itemRoutes, { prefix: '/api/items' });

  fastify.get('/health', async () => ({ status: 'ok' }));

  const port = Number(process.env['PORT'] ?? 4000);
  await fastify.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
`;
}

function fastifyRoutes(): string {
  return `import type { FastifyPluginAsync } from 'fastify';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const items: Item[] = [];

export const itemRoutes: FastifyPluginAsync = async (fastify) => {
  // List all items
  fastify.get('/', async () => {
    return items;
  });

  // Get item by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const item = items.find((i) => i.id === request.params.id);
    if (!item) return reply.notFound('Item not found');
    return item;
  });

  // Create item
  fastify.post<{ Body: { title: string } }>('/', async (request, reply) => {
    const { title } = request.body;
    if (!title) return reply.badRequest('Title is required');

    const item: Item = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    return reply.status(201).send(item);
  });

  // Update item
  fastify.put<{ Params: { id: string }; Body: { title?: string; completed?: boolean } }>(
    '/:id',
    async (request, reply) => {
      const item = items.find((i) => i.id === request.params.id);
      if (!item) return reply.notFound('Item not found');

      const { title, completed } = request.body;
      if (title !== undefined) item.title = title;
      if (completed !== undefined) item.completed = completed;
      return item;
    },
  );

  // Delete item
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const index = items.findIndex((i) => i.id === request.params.id);
    if (index === -1) return reply.notFound('Item not found');
    items.splice(index, 1);
    return reply.status(204).send();
  });
};
`;
}

function fastifyCorsPlugin(): string {
  return `import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });
};

export default fp(corsPlugin);
`;
}

// ─── Hono entry point ──────────────────────────────────────────────

function honoEntry(): string {
  return `import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { itemRoutes } from './routes/items.js';

const app = new Hono();

app.use('/*', cors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/items', itemRoutes);

const port = Number(process.env['PORT'] ?? 4000);
console.log(\`Server running on http://localhost:\${port}\`);

serve({ fetch: app.fetch, port });
`;
}

function honoRoutes(): string {
  return `import { Hono } from 'hono';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const items: Item[] = [];

export const itemRoutes = new Hono();

itemRoutes.get('/', (c) => c.json(items));

itemRoutes.get('/:id', (c) => {
  const item = items.find((i) => i.id === c.req.param('id'));
  if (!item) return c.json({ error: 'Item not found' }, 404);
  return c.json(item);
});

itemRoutes.post('/', async (c) => {
  const { title } = await c.req.json<{ title: string }>();
  if (!title) return c.json({ error: 'Title is required' }, 400);

  const item: Item = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  return c.json(item, 201);
});

itemRoutes.put('/:id', async (c) => {
  const item = items.find((i) => i.id === c.req.param('id'));
  if (!item) return c.json({ error: 'Item not found' }, 404);

  const { title, completed } = await c.req.json<{ title?: string; completed?: boolean }>();
  if (title !== undefined) item.title = title;
  if (completed !== undefined) item.completed = completed;
  return c.json(item);
});

itemRoutes.delete('/:id', (c) => {
  const index = items.findIndex((i) => i.id === c.req.param('id'));
  if (index === -1) return c.json({ error: 'Item not found' }, 404);
  items.splice(index, 1);
  return c.body(null, 204);
});
`;
}

// ─── Elysia entry point ───────────────────────────────────────────

function elysiaEntry(): string {
  return `import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { itemRoutes } from './routes/items.js';

const app = new Elysia()
  .use(cors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' }))
  .get('/health', () => ({ status: 'ok' }))
  .use(itemRoutes)
  .listen(Number(process.env['PORT'] ?? 4000));

console.log(\`Server running on http://localhost:\${app.server?.port}\`);
`;
}

function elysiaRoutes(): string {
  return `import { Elysia, t } from 'elysia';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const items: Item[] = [];

export const itemRoutes = new Elysia({ prefix: '/api/items' })
  .get('/', () => items)

  .get('/:id', ({ params, set }) => {
    const item = items.find((i) => i.id === params.id);
    if (!item) {
      set.status = 404;
      return { error: 'Item not found' };
    }
    return item;
  })

  .post(
    '/',
    ({ body, set }) => {
      const item: Item = {
        id: crypto.randomUUID(),
        title: body.title,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      items.push(item);
      set.status = 201;
      return item;
    },
    { body: t.Object({ title: t.String() }) },
  )

  .put(
    '/:id',
    ({ params, body, set }) => {
      const item = items.find((i) => i.id === params.id);
      if (!item) {
        set.status = 404;
        return { error: 'Item not found' };
      }
      if (body.title !== undefined) item.title = body.title;
      if (body.completed !== undefined) item.completed = body.completed;
      return item;
    },
    { body: t.Object({ title: t.Optional(t.String()), completed: t.Optional(t.Boolean()) }) },
  )

  .delete('/:id', ({ params, set }) => {
    const index = items.findIndex((i) => i.id === params.id);
    if (index === -1) {
      set.status = 404;
      return { error: 'Item not found' };
    }
    items.splice(index, 1);
    set.status = 204;
  });
`;
}

// ─── NestJS ────────────────────────────────────────────────────────

function nestEntry(): string {
  return `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  });
  const port = process.env['PORT'] ?? 4000;
  await app.listen(port);
  console.log(\`Server running on http://localhost:\${port}\`);
}

bootstrap();
`;
}

function nestAppModule(): string {
  return `import { Module } from '@nestjs/common';
import { ItemsModule } from './items/items.module.js';

@Module({
  imports: [ItemsModule],
})
export class AppModule {}
`;
}

function nestItemsModule(): string {
  return `import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
`;
}

function nestItemsController(): string {
  return `import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ItemsService } from './items.service.js';

@Controller('api/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  create(@Body() body: { title: string }) {
    return this.itemsService.create(body.title);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; completed?: boolean }) {
    return this.itemsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
`;
}

function nestItemsService(): string {
  return `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

@Injectable()
export class ItemsService {
  private items: Item[] = [];

  findAll(): Item[] {
    return this.items;
  }

  findOne(id: string): Item {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  create(title: string): Item {
    if (!title) throw new BadRequestException('Title is required');
    const item: Item = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this.items.push(item);
    return item;
  }

  update(id: string, data: { title?: string; completed?: boolean }): Item {
    const item = this.findOne(id);
    if (data.title !== undefined) item.title = data.title;
    if (data.completed !== undefined) item.completed = data.completed;
    return item;
  }

  remove(id: string): void {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException('Item not found');
    this.items.splice(index, 1);
  }
}
`;
}

// ─── Python backends ───────────────────────────────────────────────

function pythonRequirements(ctx: GeneratorContext): string {
  const deps: string[] = [];

  if (hasTech(ctx, 'django')) {
    deps.push('django>=5.1,<6.0', 'django-cors-headers>=4.6,<5.0', 'djangorestframework>=3.15,<4.0');
  }
  if (hasTech(ctx, 'flask')) {
    deps.push('flask>=3.1,<4.0', 'flask-cors>=5.0,<6.0');
  }
  if (hasTech(ctx, 'fastapi')) {
    deps.push('fastapi>=0.115,<1.0', 'uvicorn[standard]>=0.34,<1.0', 'pydantic>=2.10,<3.0');
  }
  if (hasTech(ctx, 'starlette')) {
    deps.push('starlette>=0.41,<1.0', 'uvicorn[standard]>=0.34,<1.0', 'httpx>=0.28,<1.0');
  }

  if (hasTech(ctx, 'sqlalchemy')) {
    deps.push('sqlalchemy>=2.0,<3.0', 'alembic>=1.14,<2.0');
  }

  return deps.join('\n') + '\n';
}

function fastapiEntry(): string {
  return `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.items import router as items_router
import os

app = FastAPI(title="API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(items_router, prefix="/api/items", tags=["items"])
`;
}

function fastapiRoutes(): string {
  return `from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uuid

router = APIRouter()


class ItemCreate(BaseModel):
    title: str


class ItemUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None


class Item(BaseModel):
    id: str
    title: str
    completed: bool
    created_at: str


items: list[Item] = []


@router.get("/", response_model=list[Item])
async def list_items():
    return items


@router.get("/{item_id}", response_model=Item)
async def get_item(item_id: str):
    item = next((i for i in items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/", response_model=Item, status_code=201)
async def create_item(data: ItemCreate):
    item = Item(
        id=str(uuid.uuid4()),
        title=data.title,
        completed=False,
        created_at=datetime.now().isoformat(),
    )
    items.append(item)
    return item


@router.put("/{item_id}", response_model=Item)
async def update_item(item_id: str, data: ItemUpdate):
    item = next((i for i in items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if data.title is not None:
        item.title = data.title
    if data.completed is not None:
        item.completed = data.completed
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: str):
    global items
    before = len(items)
    items = [i for i in items if i.id != item_id]
    if len(items) == before:
        raise HTTPException(status_code=404, detail="Item not found")
`;
}

function flaskEntry(): string {
  return `from flask import Flask
from flask_cors import CORS
from .routes.items import items_bp
import os

app = Flask(__name__)
CORS(app, origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")])


@app.get("/health")
def health():
    return {"status": "ok"}


app.register_blueprint(items_bp, url_prefix="/api/items")

if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", "4000")), debug=True)
`;
}

function flaskRoutes(): string {
  return `from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid

items_bp = Blueprint("items", __name__)

items: list[dict] = []


@items_bp.get("/")
def list_items():
    return jsonify(items)


@items_bp.get("/<item_id>")
def get_item(item_id: str):
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item)


@items_bp.post("/")
def create_item():
    data = request.get_json()
    title = data.get("title") if data else None
    if not title:
        return jsonify({"error": "Title is required"}), 400

    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "completed": False,
        "created_at": datetime.now().isoformat(),
    }
    items.append(item)
    return jsonify(item), 201


@items_bp.put("/<item_id>")
def update_item(item_id: str):
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json()
    if data.get("title") is not None:
        item["title"] = data["title"]
    if data.get("completed") is not None:
        item["completed"] = data["completed"]
    return jsonify(item)


@items_bp.delete("/<item_id>")
def delete_item(item_id: str):
    global items
    before = len(items)
    items = [i for i in items if i["id"] != item_id]
    if len(items) == before:
        return jsonify({"error": "Item not found"}), 404
    return "", 204
`;
}

// ─── Starlette ────────────────────────────────────────────────────

function starletteEntry(): string {
  return `from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Route, Mount
from starlette.responses import JSONResponse
from .routes.items import item_routes
import os

async def health(request):
    return JSONResponse({"status": "ok"})


app = Starlette(
    routes=[
        Route("/health", health),
        Mount("/api/items", routes=item_routes),
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
`;
}

function starletteRoutes(): string {
  return `from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route
from datetime import datetime
import uuid
import json

items: list[dict] = []


async def list_items(request: Request) -> JSONResponse:
    return JSONResponse(items)


async def get_item(request: Request) -> JSONResponse:
    item_id = request.path_params["item_id"]
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return JSONResponse({"error": "Item not found"}, status_code=404)
    return JSONResponse(item)


async def create_item(request: Request) -> JSONResponse:
    body = await request.json()
    title = body.get("title")
    if not title:
        return JSONResponse({"error": "Title is required"}, status_code=400)

    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "completed": False,
        "created_at": datetime.now().isoformat(),
    }
    items.append(item)
    return JSONResponse(item, status_code=201)


async def update_item(request: Request) -> JSONResponse:
    item_id = request.path_params["item_id"]
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return JSONResponse({"error": "Item not found"}, status_code=404)

    body = await request.json()
    if body.get("title") is not None:
        item["title"] = body["title"]
    if body.get("completed") is not None:
        item["completed"] = body["completed"]
    return JSONResponse(item)


async def delete_item(request: Request) -> Response:
    item_id = request.path_params["item_id"]
    global items
    before = len(items)
    items = [i for i in items if i["id"] != item_id]
    if len(items) == before:
        return JSONResponse({"error": "Item not found"}, status_code=404)
    return Response(status_code=204)


item_routes = [
    Route("/", list_items, methods=["GET"]),
    Route("/", create_item, methods=["POST"]),
    Route("/{item_id}", get_item, methods=["GET"]),
    Route("/{item_id}", update_item, methods=["PUT"]),
    Route("/{item_id}", delete_item, methods=["DELETE"]),
]
`;
}

// ─── Go backends ───────────────────────────────────────────────────

function goMod(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  let deps = '';
  if (hasTech(ctx, 'gin')) {
    deps = `\nrequire github.com/gin-gonic/gin v1.10.0`;
  } else if (hasTech(ctx, 'echo')) {
    deps = `\nrequire github.com/labstack/echo/v4 v4.13.3`;
  } else if (hasTech(ctx, 'chi')) {
    deps = `\nrequire github.com/go-chi/chi/v5 v5.2.0\nrequire github.com/go-chi/cors v1.2.1`;
  }
  return `module ${name}

go 1.23
${deps}
`;
}

function ginEntry(ctx: GeneratorContext): string {
  return `package main

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Item struct {
	ID        string \`json:"id"\`
	Title     string \`json:"title"\`
	Completed bool   \`json:"completed"\`
	CreatedAt string \`json:"createdAt"\`
}

var items []Item

func main() {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/items")
	{
		api.GET("", listItems)
		api.GET("/:id", getItem)
		api.POST("", createItem)
		api.PUT("/:id", updateItem)
		api.DELETE("/:id", deleteItem)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	r.Run(":" + port)
}

func listItems(c *gin.Context) {
	c.JSON(http.StatusOK, items)
}

func getItem(c *gin.Context) {
	id := c.Param("id")
	for _, item := range items {
		if item.ID == id {
			c.JSON(http.StatusOK, item)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
}

func createItem(c *gin.Context) {
	var body struct {
		Title string \`json:"title" binding:"required"\`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}
	item := Item{
		ID:        uuid.New().String(),
		Title:     body.Title,
		Completed: false,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	items = append(items, item)
	c.JSON(http.StatusCreated, item)
}

func updateItem(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Title     *string \`json:"title"\`
		Completed *bool   \`json:"completed"\`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}
	for i, item := range items {
		if item.ID == id {
			if body.Title != nil {
				items[i].Title = *body.Title
			}
			if body.Completed != nil {
				items[i].Completed = *body.Completed
			}
			c.JSON(http.StatusOK, items[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
}

func deleteItem(c *gin.Context) {
	id := c.Param("id")
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			c.Status(http.StatusNoContent)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
}
`;
}

// ─── Echo entry point ─────────────────────────────────────────────

function echoEntry(): string {
  return `package main

import (
	"net/http"
	"os"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/google/uuid"
)

type Item struct {
	ID        string \`json:"id"\`
	Title     string \`json:"title"\`
	Completed bool   \`json:"completed"\`
	CreatedAt string \`json:"createdAt"\`
}

var items []Item

func main() {
	e := echo.New()

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{getEnv("CORS_ORIGIN", "http://localhost:3000")},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
	}))

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	api := e.Group("/api/items")
	api.GET("", listItems)
	api.GET("/:id", getItem)
	api.POST("", createItem)
	api.PUT("/:id", updateItem)
	api.DELETE("/:id", deleteItem)

	port := getEnv("PORT", "4000")
	e.Logger.Fatal(e.Start(":" + port))
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func listItems(c echo.Context) error {
	return c.JSON(http.StatusOK, items)
}

func getItem(c echo.Context) error {
	id := c.Param("id")
	for _, item := range items {
		if item.ID == id {
			return c.JSON(http.StatusOK, item)
		}
	}
	return c.JSON(http.StatusNotFound, map[string]string{"error": "Item not found"})
}

func createItem(c echo.Context) error {
	var body struct {
		Title string \`json:"title"\`
	}
	if err := c.Bind(&body); err != nil || body.Title == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Title is required"})
	}
	item := Item{
		ID:        uuid.New().String(),
		Title:     body.Title,
		Completed: false,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	items = append(items, item)
	return c.JSON(http.StatusCreated, item)
}

func updateItem(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Title     *string \`json:"title"\`
		Completed *bool   \`json:"completed"\`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid body"})
	}
	for i, item := range items {
		if item.ID == id {
			if body.Title != nil {
				items[i].Title = *body.Title
			}
			if body.Completed != nil {
				items[i].Completed = *body.Completed
			}
			return c.JSON(http.StatusOK, items[i])
		}
	}
	return c.JSON(http.StatusNotFound, map[string]string{"error": "Item not found"})
}

func deleteItem(c echo.Context) error {
	id := c.Param("id")
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return c.NoContent(http.StatusNoContent)
		}
	}
	return c.JSON(http.StatusNotFound, map[string]string{"error": "Item not found"})
}
`;
}

// ─── Chi entry point ──────────────────────────────────────────────

function chiEntry(): string {
  return `package main

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
)

type Item struct {
	ID        string \`json:"id"\`
	Title     string \`json:"title"\`
	Completed bool   \`json:"completed"\`
	CreatedAt string \`json:"createdAt"\`
}

var items []Item

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{getEnv("CORS_ORIGIN", "http://localhost:3000")},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/items", func(r chi.Router) {
		r.Get("/", listItems)
		r.Post("/", createItem)
		r.Get("/{id}", getItem)
		r.Put("/{id}", updateItem)
		r.Delete("/{id}", deleteItem)
	})

	port := getEnv("PORT", "4000")
	http.ListenAndServe(":"+port, r)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func listItems(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, items)
}

func getItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	for _, item := range items {
		if item.ID == id {
			writeJSON(w, http.StatusOK, item)
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "Item not found"})
}

func createItem(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title string \`json:"title"\`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Title is required"})
		return
	}
	item := Item{
		ID:        uuid.New().String(),
		Title:     body.Title,
		Completed: false,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	items = append(items, item)
	writeJSON(w, http.StatusCreated, item)
}

func updateItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Title     *string \`json:"title"\`
		Completed *bool   \`json:"completed"\`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid body"})
		return
	}
	for i, item := range items {
		if item.ID == id {
			if body.Title != nil {
				items[i].Title = *body.Title
			}
			if body.Completed != nil {
				items[i].Completed = *body.Completed
			}
			writeJSON(w, http.StatusOK, items[i])
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "Item not found"})
}

func deleteItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "Item not found"})
}
`;
}

// ─── Rust backends ────────────────────────────────────────────────

function rustCargoToml(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  let deps = '';
  if (hasTech(ctx, 'actix')) {
    deps = `actix-web = "4.9"
actix-cors = "0.7"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }`;
  } else if (hasTech(ctx, 'axum')) {
    deps = `axum = "0.8"
tower-http = { version = "0.6", features = ["cors"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }`;
  } else if (hasTech(ctx, 'rocket')) {
    deps = `rocket = { version = "0.5", features = ["json"] }
rocket_cors = "0.6"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }`;
  }

  return `[package]
name = "${name}"
version = "0.1.0"
edition = "2021"

[dependencies]
${deps}
`;
}

function actixEntry(): string {
  return `use actix_cors::Cors;
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Item {
    id: String,
    title: String,
    completed: bool,
    created_at: String,
}

#[derive(Deserialize)]
struct CreateItem {
    title: String,
}

#[derive(Deserialize)]
struct UpdateItem {
    title: Option<String>,
    completed: Option<bool>,
}

struct AppState {
    items: Mutex<Vec<Item>>,
}

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status": "ok"}))
}

async fn list_items(data: web::Data<AppState>) -> HttpResponse {
    let items = data.items.lock().unwrap();
    HttpResponse::Ok().json(items.clone())
}

async fn get_item(data: web::Data<AppState>, path: web::Path<String>) -> HttpResponse {
    let items = data.items.lock().unwrap();
    let id = path.into_inner();
    match items.iter().find(|i| i.id == id) {
        Some(item) => HttpResponse::Ok().json(item),
        None => HttpResponse::NotFound().json(serde_json::json!({"error": "Item not found"})),
    }
}

async fn create_item(data: web::Data<AppState>, body: web::Json<CreateItem>) -> HttpResponse {
    let mut items = data.items.lock().unwrap();
    let item = Item {
        id: Uuid::new_v4().to_string(),
        title: body.title.clone(),
        completed: false,
        created_at: Utc::now().to_rfc3339(),
    };
    items.push(item.clone());
    HttpResponse::Created().json(item)
}

async fn update_item(
    data: web::Data<AppState>,
    path: web::Path<String>,
    body: web::Json<UpdateItem>,
) -> HttpResponse {
    let mut items = data.items.lock().unwrap();
    let id = path.into_inner();
    match items.iter_mut().find(|i| i.id == id) {
        Some(item) => {
            if let Some(ref title) = body.title {
                item.title = title.clone();
            }
            if let Some(completed) = body.completed {
                item.completed = completed;
            }
            HttpResponse::Ok().json(item.clone())
        }
        None => HttpResponse::NotFound().json(serde_json::json!({"error": "Item not found"})),
    }
}

async fn delete_item(data: web::Data<AppState>, path: web::Path<String>) -> HttpResponse {
    let mut items = data.items.lock().unwrap();
    let id = path.into_inner();
    let len = items.len();
    items.retain(|i| i.id != id);
    if items.len() == len {
        HttpResponse::NotFound().json(serde_json::json!({"error": "Item not found"}))
    } else {
        HttpResponse::NoContent().finish()
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let data = web::Data::new(AppState {
        items: Mutex::new(Vec::new()),
    });
    let port: u16 = std::env::var("PORT").unwrap_or_else(|_| "4000".into()).parse().unwrap();

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .wrap(cors)
            .app_data(data.clone())
            .route("/health", web::get().to(health))
            .service(
                web::scope("/api/items")
                    .route("", web::get().to(list_items))
                    .route("", web::post().to(create_item))
                    .route("/{id}", web::get().to(get_item))
                    .route("/{id}", web::put().to(update_item))
                    .route("/{id}", web::delete().to(delete_item)),
            )
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
`;
}

function axumEntry(): string {
  return `use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json, Router,
};
use tower_http::cors::{CorsLayer, Any};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Item {
    id: String,
    title: String,
    completed: bool,
    created_at: String,
}

#[derive(Deserialize)]
struct CreateItem {
    title: String,
}

#[derive(Deserialize)]
struct UpdateItem {
    title: Option<String>,
    completed: Option<bool>,
}

type AppState = Arc<Mutex<Vec<Item>>>;

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "ok"}))
}

async fn list_items(State(state): State<AppState>) -> Json<Vec<Item>> {
    let items = state.lock().unwrap();
    Json(items.clone())
}

async fn get_item(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Item>, StatusCode> {
    let items = state.lock().unwrap();
    items.iter().find(|i| i.id == id).cloned().map(Json).ok_or(StatusCode::NOT_FOUND)
}

async fn create_item(
    State(state): State<AppState>,
    Json(body): Json<CreateItem>,
) -> (StatusCode, Json<Item>) {
    let item = Item {
        id: Uuid::new_v4().to_string(),
        title: body.title,
        completed: false,
        created_at: Utc::now().to_rfc3339(),
    };
    state.lock().unwrap().push(item.clone());
    (StatusCode::CREATED, Json(item))
}

async fn update_item(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateItem>,
) -> Result<Json<Item>, StatusCode> {
    let mut items = state.lock().unwrap();
    let item = items.iter_mut().find(|i| i.id == id).ok_or(StatusCode::NOT_FOUND)?;
    if let Some(title) = body.title {
        item.title = title;
    }
    if let Some(completed) = body.completed {
        item.completed = completed;
    }
    Ok(Json(item.clone()))
}

async fn delete_item(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> StatusCode {
    let mut items = state.lock().unwrap();
    let len = items.len();
    items.retain(|i| i.id != id);
    if items.len() == len { StatusCode::NOT_FOUND } else { StatusCode::NO_CONTENT }
}

#[tokio::main]
async fn main() {
    let state: AppState = Arc::new(Mutex::new(Vec::new()));
    let port: u16 = std::env::var("PORT").unwrap_or_else(|_| "4000".into()).parse().unwrap();

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/items", get(list_items).post(create_item))
        .route("/api/items/{id}", get(get_item).put(update_item).delete(delete_item))
        .with_state(state)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any));

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    println!("Server running on http://localhost:{port}");
    axum::serve(listener, app).await.unwrap();
}
`;
}

function rocketEntry(): string {
  return `#[macro_use]
extern crate rocket;

use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use rocket::http::Status;
use rocket::State;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
struct Item {
    id: String,
    title: String,
    completed: bool,
    created_at: String,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
struct CreateItem {
    title: String,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
struct UpdateItem {
    title: Option<String>,
    completed: Option<bool>,
}

struct AppState {
    items: Mutex<Vec<Item>>,
}

#[get("/health")]
fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "ok"}))
}

#[get("/api/items")]
fn list_items(state: &State<AppState>) -> Json<Vec<Item>> {
    let items = state.items.lock().unwrap();
    Json(items.clone())
}

#[get("/api/items/<id>")]
fn get_item(state: &State<AppState>, id: &str) -> Result<Json<Item>, Status> {
    let items = state.items.lock().unwrap();
    items.iter().find(|i| i.id == id).cloned().map(Json).ok_or(Status::NotFound)
}

#[post("/api/items", data = "<body>")]
fn create_item(state: &State<AppState>, body: Json<CreateItem>) -> (Status, Json<Item>) {
    let item = Item {
        id: Uuid::new_v4().to_string(),
        title: body.title.clone(),
        completed: false,
        created_at: Utc::now().to_rfc3339(),
    };
    state.items.lock().unwrap().push(item.clone());
    (Status::Created, Json(item))
}

#[put("/api/items/<id>", data = "<body>")]
fn update_item(state: &State<AppState>, id: &str, body: Json<UpdateItem>) -> Result<Json<Item>, Status> {
    let mut items = state.items.lock().unwrap();
    let item = items.iter_mut().find(|i| i.id == id).ok_or(Status::NotFound)?;
    if let Some(ref title) = body.title {
        item.title = title.clone();
    }
    if let Some(completed) = body.completed {
        item.completed = completed;
    }
    Ok(Json(item.clone()))
}

#[delete("/api/items/<id>")]
fn delete_item(state: &State<AppState>, id: &str) -> Status {
    let mut items = state.items.lock().unwrap();
    let len = items.len();
    items.retain(|i| i.id != id);
    if items.len() == len { Status::NotFound } else { Status::NoContent }
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .manage(AppState {
            items: Mutex::new(Vec::new()),
        })
        .mount("/", routes![health, list_items, get_item, create_item, update_item, delete_item])
}
`;
}

// ─── Java backends ────────────────────────────────────────────────

function springBootPom(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.1</version>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>${name}</artifactId>
    <version>0.1.0</version>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

function springBootApplication(ctx: GeneratorContext): string {
  return `package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:3000")
                        .allowedMethods("GET", "POST", "PUT", "DELETE");
            }
        };
    }
}
`;
}

function springBootItem(): string {
  return `package com.example.app.model;

import java.time.Instant;
import java.util.UUID;

public class Item {
    private String id;
    private String title;
    private boolean completed;
    private String createdAt;

    public Item() {}

    public Item(String title) {
        this.id = UUID.randomUUID().toString();
        this.title = title;
        this.completed = false;
        this.createdAt = Instant.now().toString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
`;
}

function springBootController(): string {
  return `package com.example.app.controller;

import com.example.app.model.Item;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final List<Item> items = new ArrayList<>();

    @GetMapping
    public List<Item> listItems() {
        return items;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getItem(@PathVariable String id) {
        return items.stream()
                .filter(i -> i.getId().equals(id))
                .findFirst()
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Item not found")));
    }

    @PostMapping
    public ResponseEntity<Item> createItem(@RequestBody Map<String, String> body) {
        Item item = new Item(body.get("title"));
        items.add(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateItem(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return items.stream()
                .filter(i -> i.getId().equals(id))
                .findFirst()
                .<ResponseEntity<?>>map(item -> {
                    if (body.containsKey("title")) item.setTitle((String) body.get("title"));
                    if (body.containsKey("completed")) item.setCompleted((Boolean) body.get("completed"));
                    return ResponseEntity.ok(item);
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Item not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable String id) {
        boolean removed = items.removeIf(i -> i.getId().equals(id));
        if (!removed) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Item not found"));
        }
        return ResponseEntity.noContent().build();
    }
}
`;
}

function springBootHealthController(): string {
  return `package com.example.app.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
`;
}

function quarkusPom(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>${name}</artifactId>
    <version>0.1.0</version>

    <properties>
        <quarkus.platform.version>3.17.5</quarkus.platform.version>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.quarkus.platform</groupId>
                <artifactId>quarkus-bom</artifactId>
                <version>\${quarkus.platform.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-rest-jackson</artifactId>
        </dependency>
        <dependency>
            <groupId>io.quarkus</groupId>
            <artifactId>quarkus-smallrye-health</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>io.quarkus.platform</groupId>
                <artifactId>quarkus-maven-plugin</artifactId>
                <version>\${quarkus.platform.version}</version>
                <executions>
                    <execution>
                        <goals>
                            <goal>build</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

function quarkusApplication(): string {
  return `package com.example.app;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/items")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ItemResource {

    public static class Item {
        public String id;
        public String title;
        public boolean completed;
        public String createdAt;
    }

    private static final List<Item> items = new ArrayList<>();

    @GET
    public List<Item> list() {
        return items;
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") String id) {
        return items.stream()
                .filter(i -> i.id.equals(id))
                .findFirst()
                .map(i -> Response.ok(i).build())
                .orElse(Response.status(404).entity(Map.of("error", "Item not found")).build());
    }

    @POST
    public Response create(Map<String, String> body) {
        Item item = new Item();
        item.id = UUID.randomUUID().toString();
        item.title = body.get("title");
        item.completed = false;
        item.createdAt = Instant.now().toString();
        items.add(item);
        return Response.status(201).entity(item).build();
    }

    @PUT
    @Path("/{id}")
    public Response update(@PathParam("id") String id, Map<String, Object> body) {
        return items.stream()
                .filter(i -> i.id.equals(id))
                .findFirst()
                .map(item -> {
                    if (body.containsKey("title")) item.title = (String) body.get("title");
                    if (body.containsKey("completed")) item.completed = (Boolean) body.get("completed");
                    return Response.ok(item).build();
                })
                .orElse(Response.status(404).entity(Map.of("error", "Item not found")).build());
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") String id) {
        boolean removed = items.removeIf(i -> i.id.equals(id));
        if (!removed) return Response.status(404).entity(Map.of("error", "Item not found")).build();
        return Response.noContent().build();
    }
}
`;
}

function quarkusHealthEndpoint(): string {
  return `package com.example.app;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.Map;

@Path("/health")
public class HealthResource {

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
`;
}

// ─── ASP.NET Core ─────────────────────────────────────────────────

function aspnetCsproj(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <RootNamespace>${name.replace(/[^a-zA-Z0-9]/g, '_')}</RootNamespace>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

</Project>
`;
}

function aspnetProgram(): string {
  return `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSingleton<ItemStore>();

var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/items", (ItemStore store) => Results.Ok(store.GetAll()));

app.MapGet("/api/items/{id}", (string id, ItemStore store) =>
{
    var item = store.GetById(id);
    return item is not null ? Results.Ok(item) : Results.NotFound(new { error = "Item not found" });
});

app.MapPost("/api/items", (CreateItemRequest req, ItemStore store) =>
{
    var item = store.Create(req.Title);
    return Results.Created($"/api/items/{item.Id}", item);
});

app.MapPut("/api/items/{id}", (string id, UpdateItemRequest req, ItemStore store) =>
{
    var item = store.Update(id, req.Title, req.Completed);
    return item is not null ? Results.Ok(item) : Results.NotFound(new { error = "Item not found" });
});

app.MapDelete("/api/items/{id}", (string id, ItemStore store) =>
{
    var removed = store.Delete(id);
    return removed ? Results.NoContent() : Results.NotFound(new { error = "Item not found" });
});

app.Run();

record CreateItemRequest(string Title);
record UpdateItemRequest(string? Title, bool? Completed);
`;
}

function aspnetItemModel(): string {
  return `public class Item
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ItemStore
{
    private readonly List<Item> _items = new();

    public List<Item> GetAll() => _items;

    public Item? GetById(string id) => _items.FirstOrDefault(i => i.Id == id);

    public Item Create(string title)
    {
        var item = new Item { Title = title };
        _items.Add(item);
        return item;
    }

    public Item? Update(string id, string? title, bool? completed)
    {
        var item = GetById(id);
        if (item is null) return null;
        if (title is not null) item.Title = title;
        if (completed.HasValue) item.Completed = completed.Value;
        return item;
    }

    public bool Delete(string id)
    {
        var item = GetById(id);
        if (item is null) return false;
        _items.Remove(item);
        return true;
    }
}
`;
}

// ─── Generator ─────────────────────────────────────────────────────

export function createBackendGenerator(): Generator {
  return {
    name: 'backend',
    description: 'Generates backend project files including server setup, routes, and CRUD endpoints',

    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const backend = getTech(ctx, 'backend');
      if (!backend) return { files: [] };

      const files: GeneratedFile[] = [];
      const commands: PostGenCommand[] = [];
      const prefix = 'backend';

      // ── Node.js backends ──
      if (isNodeBackend(ctx)) {
        files.push({ path: `${prefix}/package.json`, content: nodePackageJson(ctx) });
        files.push({ path: `${prefix}/tsconfig.json`, content: nodeTsConfig(ctx) });

        if (hasTech(ctx, 'express')) {
          files.push({ path: `${prefix}/src/index.ts`, content: expressEntry(ctx) });
          files.push({ path: `${prefix}/src/routes/items.ts`, content: expressRoutes() });
          files.push({ path: `${prefix}/src/plugins/cors.ts`, content: expressCorsPlugin() });
        }

        if (hasTech(ctx, 'fastify')) {
          files.push({ path: `${prefix}/src/index.ts`, content: fastifyEntry() });
          files.push({ path: `${prefix}/src/routes/items.ts`, content: fastifyRoutes() });
          files.push({ path: `${prefix}/src/plugins/cors.ts`, content: fastifyCorsPlugin() });
        }

        if (hasTech(ctx, 'hono')) {
          files.push({ path: `${prefix}/src/index.ts`, content: honoEntry() });
          files.push({ path: `${prefix}/src/routes/items.ts`, content: honoRoutes() });
        }

        if (hasTech(ctx, 'elysia')) {
          files.push({ path: `${prefix}/src/index.ts`, content: elysiaEntry() });
          files.push({ path: `${prefix}/src/routes/items.ts`, content: elysiaRoutes() });
        }

        if (hasTech(ctx, 'nestjs')) {
          files.push({ path: `${prefix}/src/main.ts`, content: nestEntry() });
          files.push({ path: `${prefix}/src/app.module.ts`, content: nestAppModule() });
          files.push({ path: `${prefix}/src/items/items.module.ts`, content: nestItemsModule() });
          files.push({ path: `${prefix}/src/items/items.controller.ts`, content: nestItemsController() });
          files.push({ path: `${prefix}/src/items/items.service.ts`, content: nestItemsService() });
        }

        commands.push({
          command: 'npm install',
          cwd: prefix,
          description: 'Install backend dependencies',
        });
      }

      // ── Python backends ──
      if (hasTech(ctx, 'fastapi') || hasTech(ctx, 'flask') || hasTech(ctx, 'django') || hasTech(ctx, 'starlette')) {
        files.push({ path: `${prefix}/requirements.txt`, content: pythonRequirements(ctx) });

        if (hasTech(ctx, 'fastapi')) {
          files.push({ path: `${prefix}/app/__init__.py`, content: '' });
          files.push({ path: `${prefix}/app/main.py`, content: fastapiEntry() });
          files.push({ path: `${prefix}/app/routes/__init__.py`, content: '' });
          files.push({ path: `${prefix}/app/routes/items.py`, content: fastapiRoutes() });
        }

        if (hasTech(ctx, 'flask')) {
          files.push({ path: `${prefix}/app/__init__.py`, content: flaskEntry() });
          files.push({ path: `${prefix}/app/routes/__init__.py`, content: '' });
          files.push({ path: `${prefix}/app/routes/items.py`, content: flaskRoutes() });
        }

        if (hasTech(ctx, 'starlette')) {
          files.push({ path: `${prefix}/app/__init__.py`, content: '' });
          files.push({ path: `${prefix}/app/main.py`, content: starletteEntry() });
          files.push({ path: `${prefix}/app/routes/__init__.py`, content: '' });
          files.push({ path: `${prefix}/app/routes/items.py`, content: starletteRoutes() });
        }

        commands.push({
          command: 'pip install -r requirements.txt',
          cwd: prefix,
          description: 'Install Python dependencies',
        });
      }

      // ── Go backends ──
      if (hasTech(ctx, 'gin') || hasTech(ctx, 'echo') || hasTech(ctx, 'chi')) {
        files.push({ path: `${prefix}/go.mod`, content: goMod(ctx) });

        if (hasTech(ctx, 'gin')) {
          files.push({ path: `${prefix}/main.go`, content: ginEntry(ctx) });
        }

        if (hasTech(ctx, 'echo')) {
          files.push({ path: `${prefix}/main.go`, content: echoEntry() });
        }

        if (hasTech(ctx, 'chi')) {
          files.push({ path: `${prefix}/main.go`, content: chiEntry() });
        }

        commands.push({
          command: 'go mod tidy',
          cwd: prefix,
          description: 'Download Go dependencies',
        });
      }

      // ── Rust backends ──
      if (hasTech(ctx, 'actix') || hasTech(ctx, 'axum') || hasTech(ctx, 'rocket')) {
        files.push({ path: `${prefix}/Cargo.toml`, content: rustCargoToml(ctx) });

        if (hasTech(ctx, 'actix')) {
          files.push({ path: `${prefix}/src/main.rs`, content: actixEntry() });
        }

        if (hasTech(ctx, 'axum')) {
          files.push({ path: `${prefix}/src/main.rs`, content: axumEntry() });
        }

        if (hasTech(ctx, 'rocket')) {
          files.push({ path: `${prefix}/src/main.rs`, content: rocketEntry() });
        }

        commands.push({
          command: 'cargo build',
          cwd: prefix,
          description: 'Build Rust project',
        });
      }

      // ── Java backends ──
      if (hasTech(ctx, 'spring-boot')) {
        files.push({ path: `${prefix}/pom.xml`, content: springBootPom(ctx) });
        files.push({
          path: `${prefix}/src/main/java/com/example/app/Application.java`,
          content: springBootApplication(ctx),
        });
        files.push({
          path: `${prefix}/src/main/java/com/example/app/model/Item.java`,
          content: springBootItem(),
        });
        files.push({
          path: `${prefix}/src/main/java/com/example/app/controller/ItemController.java`,
          content: springBootController(),
        });
        files.push({
          path: `${prefix}/src/main/java/com/example/app/controller/HealthController.java`,
          content: springBootHealthController(),
        });
        commands.push({
          command: 'mvn compile',
          cwd: prefix,
          description: 'Compile Spring Boot project',
        });
      }

      if (hasTech(ctx, 'quarkus')) {
        files.push({ path: `${prefix}/pom.xml`, content: quarkusPom(ctx) });
        files.push({
          path: `${prefix}/src/main/java/com/example/app/ItemResource.java`,
          content: quarkusApplication(),
        });
        files.push({
          path: `${prefix}/src/main/java/com/example/app/HealthResource.java`,
          content: quarkusHealthEndpoint(),
        });
        commands.push({
          command: 'mvn compile',
          cwd: prefix,
          description: 'Compile Quarkus project',
        });
      }

      // ── ASP.NET Core ──
      if (hasTech(ctx, 'aspnet-core')) {
        files.push({ path: `${prefix}/${ctx.selection.name}.csproj`, content: aspnetCsproj(ctx) });
        files.push({ path: `${prefix}/Program.cs`, content: aspnetProgram() });
        files.push({ path: `${prefix}/Models/Item.cs`, content: aspnetItemModel() });
        commands.push({
          command: 'dotnet build',
          cwd: prefix,
          description: 'Build ASP.NET Core project',
        });
      }

      return { files, commands };
    },
  };
}
