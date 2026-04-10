/**
 * Database configuration generator.
 * Handles: PostgreSQL, MySQL, MariaDB, MongoDB, DynamoDB, Firestore, Redis, Memcached
 * ORMs: Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy
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

function hasTech(ctx: GeneratorContext, id: string): boolean {
  return ctx.selection.technologies.some((t) => t.id === id);
}

function getTech(ctx: GeneratorContext, category: TechCategory): SelectedTech | undefined {
  return ctx.selection.technologies.find((t) => t.category === category);
}

// ─── Prisma ────────────────────────────────────────────────────────

function prismaSchema(ctx: GeneratorContext): string {
  const db = getTech(ctx, 'database');
  let provider = 'postgresql';
  if (hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb')) provider = 'mysql';
  if (hasTech(ctx, 'mongodb')) provider = 'mongodb';

  const idField =
    provider === 'mongodb'
      ? '  id    String  @id @default(auto()) @map("_id") @db.ObjectId'
      : '  id    String  @id @default(uuid())';

  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model Item {
${idField}
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
}

function prismaClient(): string {
  return `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
`;
}

// ─── Drizzle ───────────────────────────────────────────────────────

function drizzleConfig(ctx: GeneratorContext): string {
  let dialect = 'postgresql';
  if (hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb')) dialect = 'mysql';

  return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: '${dialect}',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
`;
}

function drizzleSchema(ctx: GeneratorContext): string {
  if (hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb')) {
    return `import { mysqlTable, varchar, boolean, timestamp } from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

export const items = mysqlTable('items', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
`;
  }

  return `import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
`;
}

function drizzleClient(ctx: GeneratorContext): string {
  if (hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb')) {
    return `import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

const connection = await mysql.createConnection(process.env['DATABASE_URL']!);

export const db = drizzle(connection, { schema, mode: 'default' });
`;
  }

  return `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

export const db = drizzle(pool, { schema });
`;
}

// ─── TypeORM ───────────────────────────────────────────────────────

function typeormConfig(ctx: GeneratorContext): string {
  let type = 'postgres';
  if (hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb')) type = 'mysql';
  if (hasTech(ctx, 'mongodb')) type = 'mongodb';

  return `import { DataSource } from 'typeorm';
import { Item } from './entities/Item.js';

export const AppDataSource = new DataSource({
  type: '${type}',
  url: process.env['DATABASE_URL'],
  synchronize: process.env['NODE_ENV'] !== 'production',
  logging: process.env['NODE_ENV'] !== 'production',
  entities: [Item],
  migrations: ['src/migrations/*.ts'],
});
`;
}

function typeormEntity(): string {
  return `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ default: false })
  completed!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
`;
}

// ─── Mongoose ──────────────────────────────────────────────────────

function mongooseConnection(): string {
  return `import mongoose from 'mongoose';

const MONGODB_URI = process.env['DATABASE_URL'] ?? 'mongodb://localhost:27017/app';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}
`;
}

function mongooseModel(): string {
  return `import { Schema, model, type Document } from 'mongoose';

export interface IItem extends Document {
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Item = model<IItem>('Item', itemSchema);
`;
}

// ─── SQLAlchemy ────────────────────────────────────────────────────

function sqlalchemyModels(): string {
  return `from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(256), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
`;
}

function sqlalchemyDatabase(): string {
  return `from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/app")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`;
}

// ─── Redis / Memcached ─────────────────────────────────────────────

function redisClient(): string {
  return `import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    });
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
  }
  return client;
}
`;
}

// ─── Generator ─────────────────────────────────────────────────────

export function createDatabaseGenerator(): Generator {
  return {
    name: 'database',
    description: 'Generates database configuration, ORM setup, models, and connection files',

    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const database = getTech(ctx, 'database');
      const orm = getTech(ctx, 'orm');
      const cache = getTech(ctx, 'cache');

      if (!database && !orm && !cache) return { files: [] };

      const files: GeneratedFile[] = [];
      const commands: PostGenCommand[] = [];
      const prefix = 'backend';

      // ── Prisma ──
      if (hasTech(ctx, 'prisma')) {
        files.push({ path: `${prefix}/prisma/schema.prisma`, content: prismaSchema(ctx) });
        files.push({ path: `${prefix}/src/db/client.ts`, content: prismaClient() });
        commands.push({
          command: 'npx prisma generate',
          cwd: prefix,
          description: 'Generate Prisma client',
        });
      }

      // ── Drizzle ──
      if (hasTech(ctx, 'drizzle')) {
        files.push({ path: `${prefix}/drizzle.config.ts`, content: drizzleConfig(ctx) });
        files.push({ path: `${prefix}/src/db/schema.ts`, content: drizzleSchema(ctx) });
        files.push({ path: `${prefix}/src/db/client.ts`, content: drizzleClient(ctx) });
      }

      // ── TypeORM ──
      if (hasTech(ctx, 'typeorm')) {
        files.push({ path: `${prefix}/src/db/data-source.ts`, content: typeormConfig(ctx) });
        files.push({ path: `${prefix}/src/db/entities/Item.ts`, content: typeormEntity() });
      }

      // ── Mongoose ──
      if (hasTech(ctx, 'mongoose')) {
        files.push({ path: `${prefix}/src/db/connection.ts`, content: mongooseConnection() });
        files.push({ path: `${prefix}/src/db/models/Item.ts`, content: mongooseModel() });
      }

      // ── SQLAlchemy ──
      if (hasTech(ctx, 'sqlalchemy')) {
        files.push({ path: `${prefix}/app/db/__init__.py`, content: '' });
        files.push({ path: `${prefix}/app/db/database.py`, content: sqlalchemyDatabase() });
        files.push({ path: `${prefix}/app/db/models.py`, content: sqlalchemyModels() });
      }

      // ── Redis ──
      if (hasTech(ctx, 'redis')) {
        files.push({ path: `${prefix}/src/db/redis.ts`, content: redisClient() });
      }

      return { files, commands };
    },
  };
}
