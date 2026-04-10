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

      return { files };
    },
  };
}
