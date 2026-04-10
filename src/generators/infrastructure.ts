/**
 * Infrastructure generator.
 * Handles: Docker, Podman, Kubernetes, Docker Compose, Cloud providers, CI/CD.
 */
import type {
  Generator,
  GeneratorContext,
  GeneratorResult,
  GeneratedFile,
  TechCategory,
  SelectedTech,
} from '../core/types.js';

function hasTech(ctx: GeneratorContext, id: string): boolean {
  return ctx.selection.technologies.some((t) => t.id === id);
}

function getTech(ctx: GeneratorContext, category: TechCategory): SelectedTech | undefined {
  return ctx.selection.technologies.find((t) => t.category === category);
}

function isNodeBackend(ctx: GeneratorContext): boolean {
  return (
    hasTech(ctx, 'express') ||
    hasTech(ctx, 'fastify') ||
    hasTech(ctx, 'koa') ||
    hasTech(ctx, 'hono') ||
    hasTech(ctx, 'nestjs')
  );
}

function isPythonBackend(ctx: GeneratorContext): boolean {
  return hasTech(ctx, 'fastapi') || hasTech(ctx, 'flask') || hasTech(ctx, 'django');
}

function isGoBackend(ctx: GeneratorContext): boolean {
  return hasTech(ctx, 'gin') || hasTech(ctx, 'fiber') || hasTech(ctx, 'echo');
}

// ─── Dockerfile ────────────────────────────────────────────────────

function nodeDockerfile(): string {
  return `# ── Build stage ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \\
    adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

USER appuser
EXPOSE 4000
CMD ["node", "dist/index.js"]
`;
}

function pythonDockerfile(): string {
  return `# ── Build stage ──
FROM python:3.13-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Production stage ──
FROM python:3.13-slim AS runner
WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN adduser --system --uid 1001 appuser
USER appuser

EXPOSE 4000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4000"]
`;
}

function goDockerfile(ctx: GeneratorContext): string {
  return `# ── Build stage ──
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ── Production stage ──
FROM alpine:3.20 AS runner
WORKDIR /app
RUN adduser -S -u 1001 appuser

COPY --from=builder /app/server .

USER appuser
EXPOSE 4000
CMD ["./server"]
`;
}

function frontendDockerfile(): string {
  return `# ── Build stage ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ──
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}

function nginxConf(): string {
  return `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`;
}

// ─── Docker Compose ────────────────────────────────────────────────

function dockerCompose(ctx: GeneratorContext): string {
  const services: string[] = [];
  const hasFrontend = !!getTech(ctx, 'frontend');
  const hasBackend = !!getTech(ctx, 'backend');
  const hasPostgres = hasTech(ctx, 'postgresql');
  const hasMysql = hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb');
  const hasMongo = hasTech(ctx, 'mongodb');
  const hasRedis = hasTech(ctx, 'redis');

  if (hasFrontend) {
    services.push(`  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - app-network`);
  }

  if (hasBackend) {
    const depends: string[] = [];
    if (hasPostgres) depends.push('postgres');
    if (hasMysql) depends.push('mysql');
    if (hasMongo) depends.push('mongo');
    if (hasRedis) depends.push('redis');

    const dependsOn = depends.length > 0 ? `\n    depends_on:\n${depends.map((d) => `      - ${d}`).join('\n')}` : '';

    services.push(`  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    env_file:
      - .env${dependsOn}
    networks:
      - app-network`);
  }

  if (hasPostgres) {
    services.push(`  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: \${POSTGRES_DB:-app}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network`);
  }

  if (hasMysql) {
    services.push(`  mysql:
    image: mysql:8.4
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: \${MYSQL_DATABASE:-app}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - app-network`);
  }

  if (hasMongo) {
    services.push(`  mongo:
    image: mongo:8.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD:-admin}
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network`);
  }

  if (hasRedis) {
    services.push(`  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network`);
  }

  // Volumes
  const volumes: string[] = [];
  if (hasPostgres) volumes.push('  postgres-data:');
  if (hasMysql) volumes.push('  mysql-data:');
  if (hasMongo) volumes.push('  mongo-data:');
  if (hasRedis) volumes.push('  redis-data:');

  const volumesSection = volumes.length > 0 ? `\nvolumes:\n${volumes.join('\n')}` : '';

  return `services:
${services.join('\n\n')}

networks:
  app-network:
    driver: bridge
${volumesSection}
`;
}

// ─── GitHub Actions CI ─────────────────────────────────────────────

function githubCi(ctx: GeneratorContext): string {
  const jobs: string[] = [];

  if (isNodeBackend(ctx) || getTech(ctx, 'frontend')) {
    jobs.push(`  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test`);
  }

  if (isPythonBackend(ctx)) {
    jobs.push(`  python-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -m pytest`);
  }

  if (isGoBackend(ctx)) {
    jobs.push(`  go-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: cd backend && go test ./...`);
  }

  if (hasTech(ctx, 'docker') || hasTech(ctx, 'podman')) {
    jobs.push(`  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: false
          tags: app-backend:test`);
  }

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
${jobs.join('\n\n')}
`;
}

// ─── Kubernetes manifests ──────────────────────────────────────────

function k8sDeployment(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-backend
  labels:
    app: ${name}
    component: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${name}
      component: backend
  template:
    metadata:
      labels:
        app: ${name}
        component: backend
    spec:
      containers:
        - name: backend
          image: ${name}-backend:latest
          ports:
            - containerPort: 4000
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "4000"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 10
`;
}

function k8sService(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}-backend
spec:
  selector:
    app: ${name}
    component: backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: ClusterIP
`;
}

function k8sIngress(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: ${name}.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: ${name}-backend
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${name}-frontend
                port:
                  number: 80
`;
}

// ─── Podman Containerfiles ─────────────────────────────────────────

function podmanNodeContainerfile(): string {
  return `# ── Build stage ──
FROM docker.io/library/node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ──
FROM docker.io/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \\
    adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

USER appuser
EXPOSE 4000
CMD ["node", "dist/index.js"]
`;
}

function podmanPythonContainerfile(): string {
  return `# ── Build stage ──
FROM docker.io/library/python:3.13-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Production stage ──
FROM docker.io/library/python:3.13-slim AS runner
WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN adduser --system --uid 1001 appuser
USER appuser

EXPOSE 4000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4000"]
`;
}

function podmanGoContainerfile(): string {
  return `# ── Build stage ──
FROM docker.io/library/golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ── Production stage ──
FROM docker.io/library/alpine:3.20 AS runner
WORKDIR /app
RUN adduser -S -u 1001 appuser

COPY --from=builder /app/server .

USER appuser
EXPOSE 4000
CMD ["./server"]
`;
}

function podmanFrontendContainerfile(): string {
  return `# ── Build stage ──
FROM docker.io/library/node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ──
FROM docker.io/library/nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}

// ─── Podman Compose ───────────────────────────────────────────────

function podmanCompose(ctx: GeneratorContext): string {
  const services: string[] = [];
  const hasFrontend = !!getTech(ctx, 'frontend');
  const hasBackend = !!getTech(ctx, 'backend');
  const hasPostgres = hasTech(ctx, 'postgresql');
  const hasMysql = hasTech(ctx, 'mysql') || hasTech(ctx, 'mariadb');
  const hasMongo = hasTech(ctx, 'mongodb');
  const hasRedis = hasTech(ctx, 'redis');

  if (hasFrontend) {
    services.push(`  frontend:
    build:
      context: ./frontend
      dockerfile: Containerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - app-network`);
  }

  if (hasBackend) {
    const depends: string[] = [];
    if (hasPostgres) depends.push('postgres');
    if (hasMysql) depends.push('mysql');
    if (hasMongo) depends.push('mongo');
    if (hasRedis) depends.push('redis');

    const dependsOn = depends.length > 0 ? `\n    depends_on:\n${depends.map((d) => `      - ${d}`).join('\n')}` : '';

    services.push(`  backend:
    build:
      context: ./backend
      dockerfile: Containerfile
    ports:
      - "4000:4000"
    env_file:
      - .env${dependsOn}
    networks:
      - app-network`);
  }

  if (hasPostgres) {
    services.push(`  postgres:
    image: docker.io/library/postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: \${POSTGRES_DB:-app}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network`);
  }

  if (hasMysql) {
    services.push(`  mysql:
    image: docker.io/library/mysql:8.4
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: \${MYSQL_DATABASE:-app}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - app-network`);
  }

  if (hasMongo) {
    services.push(`  mongo:
    image: docker.io/library/mongo:8.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD:-admin}
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network`);
  }

  if (hasRedis) {
    services.push(`  redis:
    image: docker.io/library/redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network`);
  }

  const volumes: string[] = [];
  if (hasPostgres) volumes.push('  postgres-data:');
  if (hasMysql) volumes.push('  mysql-data:');
  if (hasMongo) volumes.push('  mongo-data:');
  if (hasRedis) volumes.push('  redis-data:');

  const volumesSection = volumes.length > 0 ? `\nvolumes:\n${volumes.join('\n')}` : '';

  return `services:
${services.join('\n\n')}

networks:
  app-network:
    driver: bridge
${volumesSection}
`;
}

// ─── CircleCI ─────────────────────────────────────────────────────

function circleciConfig(ctx: GeneratorContext): string {
  const jobs: string[] = [];

  if (isNodeBackend(ctx) || getTech(ctx, 'frontend')) {
    jobs.push(`  build-and-test:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          paths:
            - node_modules
          key: v1-deps-{{ checksum "package-lock.json" }}
      - run: npm run lint
      - run: npm test
      - run: npm run build`);
  } else if (isPythonBackend(ctx)) {
    jobs.push(`  build-and-test:
    docker:
      - image: cimg/python:3.13
    steps:
      - checkout
      - run: pip install -r requirements.txt
      - run: python -m flake8 .
      - run: python -m pytest
      - run: echo "Build complete"`);
  } else if (isGoBackend(ctx)) {
    jobs.push(`  build-and-test:
    docker:
      - image: cimg/go:1.23
    steps:
      - checkout
      - restore_cache:
          keys:
            - go-mod-{{ checksum "go.sum" }}
      - run: go mod download
      - save_cache:
          paths:
            - /home/circleci/go/pkg/mod
          key: go-mod-{{ checksum "go.sum" }}
      - run: go vet ./...
      - run: go test ./...
      - run: go build -o server .`);
  }

  jobs.push(`  deploy:
    docker:
      - image: cimg/base:current
    steps:
      - checkout
      - run:
          name: Deploy
          command: echo "Add deployment steps here"`);

  return `version: 2.1

jobs:
${jobs.join('\n\n')}

workflows:
  build-test-deploy:
    jobs:
      - build-and-test
      - deploy:
          requires:
            - build-and-test
          filters:
            branches:
              only: main
`;
}

// ─── Jenkins ──────────────────────────────────────────────────────

function jenkinsfile(ctx: GeneratorContext): string {
  let installStage: string;
  let lintStage: string;
  let testStage: string;
  let buildStage: string;

  if (isNodeBackend(ctx) || getTech(ctx, 'frontend')) {
    installStage = `        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }`;
    lintStage = `        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }`;
    testStage = `        stage('Test') {
            steps {
                sh 'npm test'
            }
        }`;
    buildStage = `        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }`;
  } else if (isPythonBackend(ctx)) {
    installStage = `        stage('Install') {
            steps {
                sh 'pip install -r requirements.txt'
            }
        }`;
    lintStage = `        stage('Lint') {
            steps {
                sh 'python -m flake8 .'
            }
        }`;
    testStage = `        stage('Test') {
            steps {
                sh 'python -m pytest'
            }
        }`;
    buildStage = `        stage('Build') {
            steps {
                echo 'Build complete'
            }
        }`;
  } else if (isGoBackend(ctx)) {
    installStage = `        stage('Install') {
            steps {
                sh 'go mod download'
            }
        }`;
    lintStage = `        stage('Lint') {
            steps {
                sh 'go vet ./...'
            }
        }`;
    testStage = `        stage('Test') {
            steps {
                sh 'go test ./...'
            }
        }`;
    buildStage = `        stage('Build') {
            steps {
                sh 'go build -o server .'
            }
        }`;
  } else {
    installStage = `        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }`;
    lintStage = `        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }`;
    testStage = `        stage('Test') {
            steps {
                sh 'npm test'
            }
        }`;
    buildStage = `        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }`;
  }

  return `pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
    }

    stages {
${installStage}

${lintStage}

${testStage}

${buildStage}

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo 'Add deployment steps here'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully'
        }
        failure {
            echo 'Pipeline failed'
        }
    }
}
`;
}

// ─── Azure Pipelines ──────────────────────────────────────────────

function azurePipelines(ctx: GeneratorContext): string {
  let pool = 'vmImage: ubuntu-latest';
  let steps: string;

  if (isNodeBackend(ctx) || getTech(ctx, 'frontend')) {
    steps = `  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm run lint
    displayName: 'Lint'

  - script: npm test
    displayName: 'Test'

  - script: npm run build
    displayName: 'Build'`;
  } else if (isPythonBackend(ctx)) {
    steps = `  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.13'
    displayName: 'Use Python 3.13'

  - script: pip install -r requirements.txt
    displayName: 'Install dependencies'

  - script: python -m flake8 .
    displayName: 'Lint'

  - script: python -m pytest
    displayName: 'Test'`;
  } else if (isGoBackend(ctx)) {
    steps = `  - task: GoTool@0
    inputs:
      version: '1.23'
    displayName: 'Install Go'

  - script: go mod download
    displayName: 'Install dependencies'

  - script: go vet ./...
    displayName: 'Lint'

  - script: go test ./...
    displayName: 'Test'

  - script: go build -o server .
    displayName: 'Build'`;
  } else {
    steps = `  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm run lint
    displayName: 'Lint'

  - script: npm test
    displayName: 'Test'

  - script: npm run build
    displayName: 'Build'`;
  }

  return `trigger:
  branches:
    include:
      - main

pool:
  ${pool}

steps:
${steps}

  - script: echo 'Add deployment steps here'
    displayName: 'Deploy'
`;
}

// ─── Vercel ───────────────────────────────────────────────────────

function vercelConfig(ctx: GeneratorContext): string {
  const config: Record<string, unknown> = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null as string | null,
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm ci',
  };

  const frontend = getTech(ctx, 'frontend');
  if (frontend) {
    if (frontend.id === 'nextjs') {
      config.framework = 'nextjs';
      config.outputDirectory = '.next';
    } else if (frontend.id === 'nuxt') {
      config.framework = 'nuxtjs';
      config.outputDirectory = '.output';
    } else if (frontend.id === 'svelte' || frontend.id === 'sveltekit') {
      config.framework = 'sveltekit';
      config.outputDirectory = '.svelte-kit';
    } else {
      config.framework = 'vite';
      config.outputDirectory = 'dist';
    }
  }

  if (getTech(ctx, 'backend')) {
    config.rewrites = [{ source: '/api/:path*', destination: '/api/:path*' }];
  }

  return JSON.stringify(config, null, 2) + '\n';
}

// ─── Netlify ──────────────────────────────────────────────────────

function netlifyConfig(ctx: GeneratorContext): string {
  let buildCommand = 'npm run build';
  let publishDir = 'dist';

  const frontend = getTech(ctx, 'frontend');
  if (frontend) {
    if (frontend.id === 'nextjs') {
      publishDir = '.next';
    } else if (frontend.id === 'nuxt') {
      publishDir = '.output/public';
    }
  }

  return `[build]
  command = "${buildCommand}"
  publish = "${publishDir}"

[build.environment]
  NODE_VERSION = "22"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[dev]
  command = "npm run dev"
  port = 3000
  targetPort = 5173
  autoLaunch = false
`;
}

// ─── Render ───────────────────────────────────────────────────────

function renderBlueprint(ctx: GeneratorContext): string {
  const services: string[] = [];
  const name = ctx.selection.name;

  const hasBackend = !!getTech(ctx, 'backend');
  const hasFrontend = !!getTech(ctx, 'frontend');
  const hasPostgres = hasTech(ctx, 'postgresql');

  if (hasFrontend) {
    services.push(`  - type: web
    name: ${name}-frontend
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    pullRequestPreviewsEnabled: true
    headers:
      - path: /*
        name: X-Frame-Options
        value: SAMEORIGIN`);
  }

  if (hasBackend) {
    let startCommand = 'node dist/index.js';
    if (isPythonBackend(ctx)) {
      startCommand = 'uvicorn app.main:app --host 0.0.0.0 --port $PORT';
    } else if (isGoBackend(ctx)) {
      startCommand = './server';
    }

    services.push(`  - type: web
    name: ${name}-backend
    runtime: ${isPythonBackend(ctx) ? 'python' : isGoBackend(ctx) ? 'go' : 'node'}
    buildCommand: ${isNodeBackend(ctx) ? 'npm ci && npm run build' : isPythonBackend(ctx) ? 'pip install -r requirements.txt' : 'go build -o server .'}
    startCommand: ${startCommand}
    envVars:
      - key: NODE_ENV
        value: production`);
  }

  const databases: string[] = [];
  if (hasPostgres) {
    databases.push(`  - name: ${name}-db
    plan: starter
    databaseName: ${name.replace(/-/g, '_')}
    user: app`);
  }

  const dbSection = databases.length > 0 ? `\ndatabases:\n${databases.join('\n')}` : '';

  return `services:
${services.join('\n\n')}
${dbSection}
`;
}

// ─── Railway ──────────────────────────────────────────────────────

function railwayConfig(ctx: GeneratorContext): string {
  const config: Record<string, unknown> = {
    $schema: 'https://railway.app/railway.schema.json',
    build: {
      builder: 'NIXPACKS',
    },
    deploy: {
      startCommand: '',
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
    },
  };

  if (isNodeBackend(ctx)) {
    (config.deploy as Record<string, unknown>).startCommand = 'node dist/index.js';
  } else if (isPythonBackend(ctx)) {
    (config.deploy as Record<string, unknown>).startCommand = 'uvicorn app.main:app --host 0.0.0.0 --port $PORT';
  } else if (isGoBackend(ctx)) {
    (config.deploy as Record<string, unknown>).startCommand = './server';
  }

  return JSON.stringify(config, null, 2) + '\n';
}

function railwayProcfile(ctx: GeneratorContext): string {
  if (isPythonBackend(ctx)) {
    return 'web: uvicorn app.main:app --host 0.0.0.0 --port $PORT\n';
  }
  if (isGoBackend(ctx)) {
    return 'web: ./server\n';
  }
  return 'web: node dist/index.js\n';
}

// ─── GCP ──────────────────────────────────────────────────────────

function gcpAppEngine(ctx: GeneratorContext): string {
  if (isPythonBackend(ctx)) {
    return `runtime: python313
entrypoint: uvicorn app.main:app --host 0.0.0.0 --port $PORT

instance_class: F2

automatic_scaling:
  min_instances: 0
  max_instances: 5
  target_cpu_utilization: 0.65

env_variables:
  ENV: production
`;
  }

  if (isGoBackend(ctx)) {
    return `runtime: go123

instance_class: F2

automatic_scaling:
  min_instances: 0
  max_instances: 5
  target_cpu_utilization: 0.65

env_variables:
  ENV: production
`;
  }

  return `runtime: nodejs22

instance_class: F2

automatic_scaling:
  min_instances: 0
  max_instances: 5
  target_cpu_utilization: 0.65

handlers:
  - url: /api/.*
    script: auto
    secure: always
  - url: /.*
    static_files: dist/index.html
    upload: dist/index.html
    secure: always
  - url: /(.*)
    static_files: dist/\\1
    upload: dist/(.*)
    secure: always

env_variables:
  NODE_ENV: production
`;
}

// ─── Generator ─────────────────────────────────────────────────────

export function createInfrastructureGenerator(): Generator {
  return {
    name: 'infrastructure',
    description: 'Generates Docker, Kubernetes, CI/CD, and cloud infrastructure configuration files',

    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const container = getTech(ctx, 'containerization');
      const orchestration = getTech(ctx, 'orchestration');
      const cicd = getTech(ctx, 'cicd');
      const cloud = getTech(ctx, 'cloud');

      if (!container && !orchestration && !cicd && !cloud) return { files: [] };

      const files: GeneratedFile[] = [];

      // ── Docker ──
      if (hasTech(ctx, 'docker') || hasTech(ctx, 'podman')) {
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/Dockerfile', content: nodeDockerfile() });
        } else if (isPythonBackend(ctx)) {
          files.push({ path: 'backend/Dockerfile', content: pythonDockerfile() });
        } else if (isGoBackend(ctx)) {
          files.push({ path: 'backend/Dockerfile', content: goDockerfile(ctx) });
        }

        if (getTech(ctx, 'frontend')) {
          files.push({ path: 'frontend/Dockerfile', content: frontendDockerfile() });
          files.push({ path: 'frontend/nginx.conf', content: nginxConf() });
        }

        files.push({
          path: 'backend/.dockerignore',
          content: `node_modules
dist
.env
.git
*.md
`,
        });

        if (getTech(ctx, 'frontend')) {
          files.push({
            path: 'frontend/.dockerignore',
            content: `node_modules
dist
.env
.git
*.md
`,
          });
        }
      }

      // ── Docker Compose ──
      if (hasTech(ctx, 'docker-compose') || hasTech(ctx, 'docker') || hasTech(ctx, 'podman')) {
        files.push({ path: 'docker-compose.yml', content: dockerCompose(ctx) });
      }

      // ── GitHub Actions ──
      if (hasTech(ctx, 'github-actions')) {
        files.push({ path: '.github/workflows/ci.yml', content: githubCi(ctx) });
      }

      // ── GitLab CI ──
      if (hasTech(ctx, 'gitlab-ci')) {
        files.push({
          path: '.gitlab-ci.yml',
          content: `stages:
  - test
  - build

test:
  stage: test
  image: node:22-alpine
  script:
    - npm ci
    - npm run typecheck
    - npm run lint
    - npm test

build:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  script:
    - docker build -t app-backend ./backend
`,
        });
      }

      // ── Kubernetes ──
      if (hasTech(ctx, 'kubernetes')) {
        files.push({ path: 'k8s/deployment.yaml', content: k8sDeployment(ctx) });
        files.push({ path: 'k8s/service.yaml', content: k8sService(ctx) });
        files.push({ path: 'k8s/ingress.yaml', content: k8sIngress(ctx) });
      }

      // ── AWS ──
      if (hasTech(ctx, 'aws')) {
        files.push({
          path: 'infrastructure/aws/task-definition.json',
          content: JSON.stringify(
            {
              family: ctx.selection.name,
              networkMode: 'awsvpc',
              requiresCompatibilities: ['FARGATE'],
              cpu: '256',
              memory: '512',
              containerDefinitions: [
                {
                  name: 'backend',
                  image: `${ctx.selection.name}-backend:latest`,
                  portMappings: [{ containerPort: 4000, protocol: 'tcp' }],
                  essential: true,
                  logConfiguration: {
                    logDriver: 'awslogs',
                    options: {
                      'awslogs-group': `/ecs/${ctx.selection.name}`,
                      'awslogs-region': 'us-east-1',
                      'awslogs-stream-prefix': 'ecs',
                    },
                  },
                },
              ],
            },
            null,
            2,
          ),
        });
      }

      // ── Podman ──
      if (hasTech(ctx, 'podman')) {
        if (isNodeBackend(ctx)) {
          files.push({ path: 'backend/Containerfile', content: podmanNodeContainerfile() });
        } else if (isPythonBackend(ctx)) {
          files.push({ path: 'backend/Containerfile', content: podmanPythonContainerfile() });
        } else if (isGoBackend(ctx)) {
          files.push({ path: 'backend/Containerfile', content: podmanGoContainerfile() });
        }

        if (getTech(ctx, 'frontend')) {
          files.push({ path: 'frontend/Containerfile', content: podmanFrontendContainerfile() });
          files.push({ path: 'frontend/nginx.conf', content: nginxConf() });
        }

        files.push({ path: 'podman-compose.yml', content: podmanCompose(ctx) });
      }

      // ── CircleCI ──
      if (hasTech(ctx, 'circleci')) {
        files.push({ path: '.circleci/config.yml', content: circleciConfig(ctx) });
      }

      // ── Jenkins ──
      if (hasTech(ctx, 'jenkins')) {
        files.push({ path: 'Jenkinsfile', content: jenkinsfile(ctx) });
      }

      // ── Azure ──
      if (hasTech(ctx, 'azure')) {
        files.push({ path: 'azure-pipelines.yml', content: azurePipelines(ctx) });
      }

      // ── Vercel ──
      if (hasTech(ctx, 'vercel')) {
        files.push({ path: 'vercel.json', content: vercelConfig(ctx) });
      }

      // ── Netlify ──
      if (hasTech(ctx, 'netlify')) {
        files.push({ path: 'netlify.toml', content: netlifyConfig(ctx) });
      }

      // ── Render ──
      if (hasTech(ctx, 'render')) {
        files.push({ path: 'render.yaml', content: renderBlueprint(ctx) });
      }

      // ── Railway ──
      if (hasTech(ctx, 'railway')) {
        files.push({ path: 'railway.json', content: railwayConfig(ctx) });
        files.push({ path: 'Procfile', content: railwayProcfile(ctx) });
      }

      // ── GCP ──
      if (hasTech(ctx, 'gcp')) {
        files.push({ path: 'app.yaml', content: gcpAppEngine(ctx) });
      }

      return { files };
    },
  };
}
