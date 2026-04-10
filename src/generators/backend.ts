/**
 * Backend project generator.
 * Handles all backend frameworks and languages: Express, Fastify, Koa, Hono, NestJS,
 * Django, Flask, FastAPI, Spring Boot, .NET, Go (Gin/Fiber/Echo), Rust (Actix/Axum), Elixir Phoenix.
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
    hasTech(ctx, 'koa') ||
    hasTech(ctx, 'hono') ||
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

  if (hasTech(ctx, 'koa')) {
    deps['koa'] = '^2.15.3';
    deps['koa-router'] = '^13.1.0';
    deps['koa-bodyparser'] = '^4.4.1';
    deps['@koa/cors'] = '^5.0.0';
    devDeps['@types/koa'] = '^2.15.0';
    devDeps['@types/koa-router'] = '^7.4.8';
    devDeps['@types/koa-bodyparser'] = '^4.3.12';
    devDeps['@types/koa__cors'] = '^5.0.0';
  }

  if (hasTech(ctx, 'hono')) {
    deps['hono'] = '^4.7.4';
    deps['@hono/node-server'] = '^1.13.8';
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

// ─── Koa entry point ───────────────────────────────────────────────

function koaEntry(): string {
  return `import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { itemRoutes } from './routes/items.js';

const app = new Koa();
const router = new Router();
const port = Number(process.env['PORT'] ?? 4000);

app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' }));
app.use(bodyParser());

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

itemRoutes(router);

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
});
`;
}

function koaRoutes(): string {
  return `import type Router from 'koa-router';

interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const items: Item[] = [];

export function itemRoutes(router: Router) {
  router.get('/api/items', (ctx) => {
    ctx.body = items;
  });

  router.get('/api/items/:id', (ctx) => {
    const item = items.find((i) => i.id === ctx.params['id']);
    if (!item) {
      ctx.status = 404;
      ctx.body = { error: 'Item not found' };
      return;
    }
    ctx.body = item;
  });

  router.post('/api/items', (ctx) => {
    const { title } = ctx.request.body as { title: string };
    if (!title) {
      ctx.status = 400;
      ctx.body = { error: 'Title is required' };
      return;
    }
    const item: Item = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    ctx.status = 201;
    ctx.body = item;
  });

  router.put('/api/items/:id', (ctx) => {
    const item = items.find((i) => i.id === ctx.params['id']);
    if (!item) {
      ctx.status = 404;
      ctx.body = { error: 'Item not found' };
      return;
    }
    const { title, completed } = ctx.request.body as { title?: string; completed?: boolean };
    if (title !== undefined) item.title = title;
    if (completed !== undefined) item.completed = completed;
    ctx.body = item;
  });

  router.delete('/api/items/:id', (ctx) => {
    const index = items.findIndex((i) => i.id === ctx.params['id']);
    if (index === -1) {
      ctx.status = 404;
      ctx.body = { error: 'Item not found' };
      return;
    }
    items.splice(index, 1);
    ctx.status = 204;
  });
}
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

// ─── Go backends ───────────────────────────────────────────────────

function goMod(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  let deps = '';
  if (hasTech(ctx, 'gin')) {
    deps = `\nrequire github.com/gin-gonic/gin v1.10.0`;
  } else if (hasTech(ctx, 'fiber')) {
    deps = `\nrequire github.com/gofiber/fiber/v2 v2.52.6`;
  } else if (hasTech(ctx, 'echo')) {
    deps = `\nrequire github.com/labstack/echo/v4 v4.13.3`;
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

        if (hasTech(ctx, 'koa')) {
          files.push({ path: `${prefix}/src/index.ts`, content: koaEntry() });
          files.push({ path: `${prefix}/src/routes/items.ts`, content: koaRoutes() });
        }

        if (hasTech(ctx, 'hono')) {
          files.push({ path: `${prefix}/src/index.ts`, content: honoEntry() });
          files.push({ path: `${prefix}/src/routes/items.ts`, content: honoRoutes() });
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
      if (hasTech(ctx, 'fastapi') || hasTech(ctx, 'flask') || hasTech(ctx, 'django')) {
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

        commands.push({
          command: 'pip install -r requirements.txt',
          cwd: prefix,
          description: 'Install Python dependencies',
        });
      }

      // ── Go backends ──
      if (hasTech(ctx, 'gin') || hasTech(ctx, 'fiber') || hasTech(ctx, 'echo')) {
        files.push({ path: `${prefix}/go.mod`, content: goMod(ctx) });

        if (hasTech(ctx, 'gin')) {
          files.push({ path: `${prefix}/main.go`, content: ginEntry(ctx) });
        }

        commands.push({
          command: 'go mod tidy',
          cwd: prefix,
          description: 'Download Go dependencies',
        });
      }

      return { files, commands };
    },
  };
}
