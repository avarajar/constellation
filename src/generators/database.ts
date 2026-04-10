/**
 * Database configuration generator.
 * Handles: PostgreSQL, MySQL, MariaDB, MongoDB, DynamoDB, Firestore, Redis, Memcached
 * ORMs: Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy, Entity Framework
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

// ─── Sequelize ────────────────────────────────────────────────────

function sequelizeConfig(ctx: GeneratorContext): string {
  let dialect = 'postgres';
  if (hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb')) dialect = 'mysql';

  return `import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env['DATABASE_URL'] ?? '${dialect}://localhost:5432/app', {
  dialect: '${dialect}',
  logging: process.env['NODE_ENV'] !== 'production' ? console.log : false,
});

export default sequelize;
`;
}

function sequelizeModel(): string {
  return `import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import sequelize from './connection.js';

export class Item extends Model<InferAttributes<Item>, InferCreationAttributes<Item>> {
  declare id: string;
  declare title: string;
  declare completed: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Item.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'items',
    timestamps: true,
  },
);
`;
}

// ─── DynamoDB ─────────────────────────────────────────────────────

function dynamodbClient(): string {
  return `import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  ...(process.env['DYNAMODB_ENDPOINT']
    ? { endpoint: process.env['DYNAMODB_ENDPOINT'] }
    : {}),
});

export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env['DYNAMODB_TABLE'] ?? 'Items';
`;
}

function dynamodbTableDef(): string {
  return `import { CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAME } from './client.js';

/**
 * Creates the Items table if it does not exist.
 * Useful for local development with DynamoDB Local.
 */
export async function ensureTable(): Promise<void> {
  try {
    const cmd = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    });
    await docClient.send(cmd);
    console.log(\`Table \${TABLE_NAME} created\`);
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== 'ResourceInUseException') throw err;
  }
}
`;
}

function dynamodbOperations(): string {
  return `import {
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from './client.js';

export interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export async function listItems(): Promise<Item[]> {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  return (result.Items ?? []) as Item[];
}

export async function getItem(id: string): Promise<Item | undefined> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } }),
  );
  return result.Item as Item | undefined;
}

export async function createItem(title: string): Promise<Item> {
  const item: Item = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

export async function updateItem(
  id: string,
  data: { title?: string; completed?: boolean },
): Promise<Item | undefined> {
  const parts: string[] = [];
  const values: Record<string, unknown> = {};
  const names: Record<string, string> = {};

  if (data.title !== undefined) {
    parts.push('#t = :t');
    names['#t'] = 'title';
    values[':t'] = data.title;
  }
  if (data.completed !== undefined) {
    parts.push('#c = :c');
    names['#c'] = 'completed';
    values[':c'] = data.completed;
  }

  if (parts.length === 0) return getItem(id);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: \`SET \${parts.join(', ')}\`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  );
  return result.Attributes as Item | undefined;
}

export async function deleteItem(id: string): Promise<boolean> {
  await docClient.send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }),
  );
  return true;
}
`;
}

// ─── Firestore ────────────────────────────────────────────────────

function firestoreClient(): string {
  return `import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

if (serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount as unknown as ServiceAccount),
  });
} else {
  initializeApp();
}

export const db = getFirestore();
`;
}

function firestoreHelpers(): string {
  return `import { db } from './client.js';

const COLLECTION = 'items';

export interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export async function listItems(): Promise<Item[]> {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item);
}

export async function getItem(id: string): Promise<Item | undefined> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return undefined;
  return { id: doc.id, ...doc.data() } as Item;
}

export async function createItem(title: string): Promise<Item> {
  const item: Omit<Item, 'id'> = {
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection(COLLECTION).add(item);
  return { id: ref.id, ...item };
}

export async function updateItem(
  id: string,
  data: { title?: string; completed?: boolean },
): Promise<Item | undefined> {
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return undefined;
  await ref.update(data);
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as Item;
}

export async function deleteItem(id: string): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}
`;
}

// ─── Redis ────────────────────────────────────────────────────────

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

// ─── Memcached ────────────────────────────────────────────────────

function memcachedClient(): string {
  return `import Memcached from 'memcached';

const server = process.env['MEMCACHED_URL'] ?? 'localhost:11211';
const client = new Memcached(server);

export function getCache(key: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if (err) return reject(err);
      resolve(data as string | undefined);
    });
  });
}

export function setCache(key: string, value: string, ttl = 300): Promise<void> {
  return new Promise((resolve, reject) => {
    client.set(key, value, ttl, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function deleteCache(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.del(key, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function flushCache(): Promise<void> {
  return new Promise((resolve, reject) => {
    client.flush((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
`;
}

// ─── Entity Framework ─────────────────────────────────────────────

function entityFrameworkDbContext(): string {
  return `using Microsoft.EntityFrameworkCore;

namespace App.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Item> Items => Set<Item>();
}
`;
}

function entityFrameworkItemModel(): string {
  return `using System.ComponentModel.DataAnnotations;

namespace App.Data;

public class Item
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    public bool Completed { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
`;
}

function entityFrameworkSetup(): string {
  return `using Microsoft.EntityFrameworkCore;
using App.Data;

// Add to Program.cs / service registration:
// builder.Services.AddDbContext<AppDbContext>(options =>
//     options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

public static class DatabaseSetup
{
    public static void AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? "Host=localhost;Database=app;Username=postgres;Password=postgres";

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));
    }

    public static async Task MigrateDatabase(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }
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

      // ── Sequelize ──
      if (hasTech(ctx, 'sequelize')) {
        files.push({ path: `${prefix}/src/db/connection.ts`, content: sequelizeConfig(ctx) });
        files.push({ path: `${prefix}/src/db/models/Item.ts`, content: sequelizeModel() });
      }

      // ── DynamoDB ──
      if (hasTech(ctx, 'dynamodb')) {
        files.push({ path: `${prefix}/src/db/client.ts`, content: dynamodbClient() });
        files.push({ path: `${prefix}/src/db/table.ts`, content: dynamodbTableDef() });
        files.push({ path: `${prefix}/src/db/operations.ts`, content: dynamodbOperations() });
      }

      // ── Firestore ──
      if (hasTech(ctx, 'firestore')) {
        files.push({ path: `${prefix}/src/db/client.ts`, content: firestoreClient() });
        files.push({ path: `${prefix}/src/db/items.ts`, content: firestoreHelpers() });
      }

      // ── Entity Framework ──
      if (hasTech(ctx, 'entity-framework')) {
        files.push({ path: `${prefix}/Data/AppDbContext.cs`, content: entityFrameworkDbContext() });
        files.push({ path: `${prefix}/Data/Item.cs`, content: entityFrameworkItemModel() });
        files.push({ path: `${prefix}/Data/DatabaseSetup.cs`, content: entityFrameworkSetup() });
      }

      // ── Redis ──
      if (hasTech(ctx, 'redis')) {
        files.push({ path: `${prefix}/src/db/redis.ts`, content: redisClient() });
      }

      // ── Memcached ──
      if (hasTech(ctx, 'memcached')) {
        files.push({ path: `${prefix}/src/db/memcached.ts`, content: memcachedClient() });
      }

      return { files, commands };
    },
  };
}
