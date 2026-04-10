/**
 * Frontend project generator.
 * Handles: React, Vue, Svelte, Next.js, Nuxt, Astro, Angular, Solid, Qwik
 * Plus CSS, Build tool, and State management selections.
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
import { createTemplateEngine } from '../templates/engine.js';

// ─── Helpers ───────────────────────────────────────────────────────

function hasTech(ctx: GeneratorContext, id: string): boolean {
  return ctx.selection.technologies.some((t) => t.id === id);
}

function getTech(ctx: GeneratorContext, category: TechCategory): SelectedTech | undefined {
  return ctx.selection.technologies.find((t) => t.category === category);
}

const engine = createTemplateEngine();

// ─── Package.json templates ────────────────────────────────────────

function buildPackageJson(ctx: GeneratorContext): string {
  const frontend = getTech(ctx, 'frontend');
  const css = getTech(ctx, 'css');
  const state = getTech(ctx, 'state');
  const name = ctx.selection.name;

  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  const scripts: Record<string, string> = {};

  // Framework core
  if (hasTech(ctx, 'react') || hasTech(ctx, 'nextjs')) {
    deps['react'] = '^19.0.0';
    deps['react-dom'] = '^19.0.0';
    devDeps['@types/react'] = '^19.0.10';
    devDeps['@types/react-dom'] = '^19.0.4';
  }

  if (hasTech(ctx, 'nextjs')) {
    deps['next'] = '^15.2.0';
    scripts['dev'] = 'next dev';
    scripts['build'] = 'next build';
    scripts['start'] = 'next start';
    scripts['lint'] = 'next lint';
  } else if (hasTech(ctx, 'react')) {
    // Vite is default build tool for React
    devDeps['vite'] = '^6.1.0';
    devDeps['@vitejs/plugin-react'] = '^4.3.4';
    scripts['dev'] = 'vite';
    scripts['build'] = 'tsc -b && vite build';
    scripts['preview'] = 'vite preview';
  }

  if (hasTech(ctx, 'vue') || hasTech(ctx, 'nuxt')) {
    deps['vue'] = '^3.5.13';
  }

  if (hasTech(ctx, 'nuxt')) {
    deps['nuxt'] = '^3.15.4';
    scripts['dev'] = 'nuxt dev';
    scripts['build'] = 'nuxt build';
    scripts['generate'] = 'nuxt generate';
    scripts['preview'] = 'nuxt preview';
  } else if (hasTech(ctx, 'vue')) {
    devDeps['vite'] = '^6.1.0';
    devDeps['@vitejs/plugin-vue'] = '^5.2.1';
    devDeps['vue-tsc'] = '^2.2.0';
    scripts['dev'] = 'vite';
    scripts['build'] = 'vue-tsc -b && vite build';
    scripts['preview'] = 'vite preview';
  }

  if (hasTech(ctx, 'svelte')) {
    deps['svelte'] = '^5.19.0';
    devDeps['vite'] = '^6.1.0';
    devDeps['@sveltejs/vite-plugin-svelte'] = '^5.0.3';
    devDeps['svelte-check'] = '^4.1.4';
    scripts['dev'] = 'vite';
    scripts['build'] = 'vite build';
    scripts['preview'] = 'vite preview';
    scripts['check'] = 'svelte-check';
  }

  if (hasTech(ctx, 'astro')) {
    deps['astro'] = '^5.3.0';
    scripts['dev'] = 'astro dev';
    scripts['build'] = 'astro build';
    scripts['preview'] = 'astro preview';
  }

  if (hasTech(ctx, 'angular')) {
    deps['@angular/core'] = '^19.1.0';
    deps['@angular/common'] = '^19.1.0';
    deps['@angular/compiler'] = '^19.1.0';
    deps['@angular/platform-browser'] = '^19.1.0';
    deps['@angular/platform-browser-dynamic'] = '^19.1.0';
    deps['@angular/router'] = '^19.1.0';
    deps['rxjs'] = '^7.8.1';
    deps['zone.js'] = '^0.15.0';
    devDeps['@angular/cli'] = '^19.1.0';
    devDeps['@angular/compiler-cli'] = '^19.1.0';
    scripts['dev'] = 'ng serve';
    scripts['build'] = 'ng build';
    scripts['test'] = 'ng test';
  }

  if (hasTech(ctx, 'solid')) {
    deps['solid-js'] = '^1.9.4';
    devDeps['vite'] = '^6.1.0';
    devDeps['vite-plugin-solid'] = '^2.11.0';
    scripts['dev'] = 'vite';
    scripts['build'] = 'vite build';
    scripts['preview'] = 'vite preview';
  }

  if (hasTech(ctx, 'qwik')) {
    deps['@builder.io/qwik'] = '^2.0.0';
    deps['@builder.io/qwik-city'] = '^2.0.0';
    devDeps['vite'] = '^6.1.0';
    scripts['dev'] = 'vite';
    scripts['build'] = 'qwik build';
    scripts['preview'] = 'vite preview';
  }

  // CSS framework
  if (hasTech(ctx, 'tailwind')) {
    devDeps['tailwindcss'] = '^4.0.6';
    devDeps['@tailwindcss/postcss'] = '^4.0.6';
    devDeps['postcss'] = '^8.5.1';
    devDeps['autoprefixer'] = '^10.4.20';
  }

  if (hasTech(ctx, 'sass')) {
    devDeps['sass'] = '^1.83.4';
  }

  if (hasTech(ctx, 'styled-components')) {
    deps['styled-components'] = '^6.1.14';
  }

  if (hasTech(ctx, 'css-modules')) {
    // Built-in with Vite, no extra deps
  }

  // State management
  if (hasTech(ctx, 'zustand')) {
    deps['zustand'] = '^5.0.3';
  }

  if (hasTech(ctx, 'redux')) {
    deps['@reduxjs/toolkit'] = '^2.5.1';
    deps['react-redux'] = '^9.2.0';
  }

  if (hasTech(ctx, 'pinia')) {
    deps['pinia'] = '^2.3.1';
  }

  if (hasTech(ctx, 'jotai')) {
    deps['jotai'] = '^2.11.1';
  }

  if (hasTech(ctx, 'mobx')) {
    deps['mobx'] = '^6.13.6';
    deps['mobx-react-lite'] = '^4.1.0';
  }

  // TypeScript (always included for non-Angular)
  if (!hasTech(ctx, 'angular')) {
    devDeps['typescript'] = '^5.7.3';
  }

  return JSON.stringify(
    {
      name: `${name}-frontend`,
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

// ─── File generators ───────────────────────────────────────────────

function generateTsConfig(ctx: GeneratorContext): string {
  if (hasTech(ctx, 'nextjs')) {
    return JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['dom', 'dom.iterable', 'ES2022'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./src/*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
        exclude: ['node_modules'],
      },
      null,
      2,
    );
  }

  const jsx = hasTech(ctx, 'react') || hasTech(ctx, 'solid') ? 'react-jsx' : hasTech(ctx, 'svelte') ? 'preserve' : undefined;

  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        ...(jsx ? { jsx } : {}),
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src'],
      exclude: ['node_modules'],
    },
    null,
    2,
  );
}

function generateViteConfig(ctx: GeneratorContext): string {
  if (hasTech(ctx, 'react')) {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
`;
  }

  if (hasTech(ctx, 'vue')) {
    return `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
`;
  }

  if (hasTech(ctx, 'svelte')) {
    return `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
`;
  }

  if (hasTech(ctx, 'solid')) {
    return `import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
`;
  }

  // Generic Vite config
  return `import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
});
`;
}

function generateNextConfig(): string {
  return `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`;
}

function generateTailwindConfig(): string {
  return `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,vue,svelte,astro}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;
}

function generatePostcssConfig(): string {
  return `export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
`;
}

function generateIndexHtml(ctx: GeneratorContext): string {
  const name = ctx.selection.name;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

// ─── React files ───────────────────────────────────────────────────

function generateReactMain(ctx: GeneratorContext): string {
  const cssImport = hasTech(ctx, 'tailwind') ? "import './index.css';" : '';
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
${cssImport}

const root = document.getElementById('app');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;
}

function generateReactApp(ctx: GeneratorContext): string {
  const stateImport = hasTech(ctx, 'zustand')
    ? "import { ItemList } from './components/ItemList';"
    : hasTech(ctx, 'redux')
      ? "import { ItemList } from './components/ItemList';"
      : '';

  return `${stateImport}

function App() {
  return (
    <div${hasTech(ctx, 'tailwind') ? ' className="min-h-screen bg-gray-50 p-8"' : ''}>
      <h1${hasTech(ctx, 'tailwind') ? ' className="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
      ${stateImport ? '<ItemList />' : '<p>Welcome to your new project.</p>'}
    </div>
  );
}

export default App;
`;
}

function generateZustandStore(): string {
  return `import { create } from 'zustand';

export interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface ItemStore {
  items: Item[];
  loading: boolean;
  addItem: (title: string) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string) => void;
  updateItem: (id: string, title: string) => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  loading: false,

  addItem: (title: string) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: crypto.randomUUID(),
          title,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  removeItem: (id: string) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  toggleItem: (id: string) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    })),

  updateItem: (id: string, title: string) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, title } : item,
      ),
    })),
}));
`;
}

function generateReduxStore(): string {
  return `import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

export interface Item {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface ItemState {
  items: Item[];
  loading: boolean;
}

const initialState: ItemState = {
  items: [],
  loading: false,
};

const itemSlice = createSlice({
  name: 'items',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<string>) => {
      state.items.push({
        id: crypto.randomUUID(),
        title: action.payload,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    toggleItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) item.completed = !item.completed;
    },
    updateItem: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.title = action.payload.title;
    },
  },
});

export const { addItem, removeItem, toggleItem, updateItem } = itemSlice.actions;

export const store = configureStore({
  reducer: {
    items: itemSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
}

function generateItemListReactZustand(ctx: GeneratorContext): string {
  const tw = hasTech(ctx, 'tailwind');
  return `import { useState } from 'react';
import { useItemStore } from '../store';

export function ItemList() {
  const { items, addItem, removeItem, toggleItem } = useItemStore();
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addItem(newTitle.trim());
    setNewTitle('');
  };

  return (
    <div${tw ? ' className="max-w-xl"' : ''}>
      <div${tw ? ' className="flex gap-2 mb-4"' : ''}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add new item..."
          ${tw ? 'className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"' : ''}
        />
        <button onClick={handleAdd}${tw ? ' className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"' : ''}>
          Add
        </button>
      </div>
      <ul${tw ? ' className="space-y-2"' : ''}>
        {items.map((item) => (
          <li key={item.id}${tw ? ' className="flex items-center gap-3 p-3 bg-white rounded shadow-sm"' : ''}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item.id)}
            />
            <span${tw ? ` className={\`flex-1 \${item.completed ? 'line-through text-gray-400' : ''}\`}` : ''}>
              {item.title}
            </span>
            <button onClick={() => removeItem(item.id)}${tw ? ' className="text-red-500 hover:text-red-700"' : ''}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p${tw ? ' className="text-gray-500 text-center py-8"' : ''}>No items yet. Add one above.</p>
      )}
    </div>
  );
}
`;
}

function generateItemListReactRedux(ctx: GeneratorContext): string {
  const tw = hasTech(ctx, 'tailwind');
  return `import { useState } from 'react';
import { useAppDispatch, useAppSelector, addItem, removeItem, toggleItem } from '../store';

export function ItemList() {
  const items = useAppSelector((state) => state.items.items);
  const dispatch = useAppDispatch();
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    dispatch(addItem(newTitle.trim()));
    setNewTitle('');
  };

  return (
    <div${tw ? ' className="max-w-xl"' : ''}>
      <div${tw ? ' className="flex gap-2 mb-4"' : ''}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add new item..."
          ${tw ? 'className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"' : ''}
        />
        <button onClick={handleAdd}${tw ? ' className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"' : ''}>
          Add
        </button>
      </div>
      <ul${tw ? ' className="space-y-2"' : ''}>
        {items.map((item) => (
          <li key={item.id}${tw ? ' className="flex items-center gap-3 p-3 bg-white rounded shadow-sm"' : ''}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => dispatch(toggleItem(item.id))}
            />
            <span${tw ? ` className={\`flex-1 \${item.completed ? 'line-through text-gray-400' : ''}\`}` : ''}>
              {item.title}
            </span>
            <button onClick={() => dispatch(removeItem(item.id))}${tw ? ' className="text-red-500 hover:text-red-700"' : ''}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p${tw ? ' className="text-gray-500 text-center py-8"' : ''}>No items yet. Add one above.</p>
      )}
    </div>
  );
}
`;
}

function generateTailwindCss(): string {
  return `@import 'tailwindcss';
`;
}

// ─── Vue files ─────────────────────────────────────────────────────

function generateVueMain(): string {
  return `import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');
`;
}

function generateVueApp(ctx: GeneratorContext): string {
  const tw = hasTech(ctx, 'tailwind');
  return `<script setup lang="ts">
import ItemList from './components/ItemList.vue';
</script>

<template>
  <div${tw ? ' class="min-h-screen bg-gray-50 p-8"' : ''}>
    <h1${tw ? ' class="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
    <ItemList />
  </div>
</template>
`;
}

function generateVueItemList(ctx: GeneratorContext): string {
  const tw = hasTech(ctx, 'tailwind');
  return `<script setup lang="ts">
import { ref, reactive } from 'vue';

interface Item {
  id: string;
  title: string;
  completed: boolean;
}

const items = reactive<Item[]>([]);
const newTitle = ref('');

function addItem() {
  if (!newTitle.value.trim()) return;
  items.push({
    id: crypto.randomUUID(),
    title: newTitle.value.trim(),
    completed: false,
  });
  newTitle.value = '';
}

function removeItem(id: string) {
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) items.splice(index, 1);
}

function toggleItem(id: string) {
  const item = items.find((i) => i.id === id);
  if (item) item.completed = !item.completed;
}
</script>

<template>
  <div${tw ? ' class="max-w-xl"' : ''}>
    <div${tw ? ' class="flex gap-2 mb-4"' : ''}>
      <input
        v-model="newTitle"
        type="text"
        placeholder="Add new item..."
        @keydown.enter="addItem"
        ${tw ? 'class="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"' : ''}
      />
      <button @click="addItem"${tw ? ' class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"' : ''}>Add</button>
    </div>
    <ul${tw ? ' class="space-y-2"' : ''}>
      <li v-for="item in items" :key="item.id"${tw ? ' class="flex items-center gap-3 p-3 bg-white rounded shadow-sm"' : ''}>
        <input type="checkbox" :checked="item.completed" @change="toggleItem(item.id)" />
        <span${tw ? ' :class="[\'flex-1\', item.completed && \'line-through text-gray-400\']"' : ''}>{{ item.title }}</span>
        <button @click="removeItem(item.id)"${tw ? ' class="text-red-500 hover:text-red-700"' : ''}>Delete</button>
      </li>
    </ul>
    <p v-if="items.length === 0"${tw ? ' class="text-gray-500 text-center py-8"' : ''}>No items yet. Add one above.</p>
  </div>
</template>
`;
}

function generateVueIndexHtml(ctx: GeneratorContext): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ctx.selection.name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

// ─── Svelte files ──────────────────────────────────────────────────

function generateSvelteMain(): string {
  return `import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
`;
}

function generateSvelteApp(ctx: GeneratorContext): string {
  const tw = hasTech(ctx, 'tailwind');
  return `<script lang="ts">
  import ItemList from './components/ItemList.svelte';
</script>

<div${tw ? ' class="min-h-screen bg-gray-50 p-8"' : ''}>
  <h1${tw ? ' class="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
  <ItemList />
</div>
`;
}

function generateSvelteItemList(ctx: GeneratorContext): string {
  const tw = hasTech(ctx, 'tailwind');
  return `<script lang="ts">
  interface Item {
    id: string;
    title: string;
    completed: boolean;
  }

  let items: Item[] = $state([]);
  let newTitle = $state('');

  function addItem() {
    if (!newTitle.trim()) return;
    items = [...items, { id: crypto.randomUUID(), title: newTitle.trim(), completed: false }];
    newTitle = '';
  }

  function removeItem(id: string) {
    items = items.filter((item) => item.id !== id);
  }

  function toggleItem(id: string) {
    items = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
  }
</script>

<div${tw ? ' class="max-w-xl"' : ''}>
  <div${tw ? ' class="flex gap-2 mb-4"' : ''}>
    <input
      type="text"
      bind:value={newTitle}
      placeholder="Add new item..."
      onkeydown={(e) => e.key === 'Enter' && addItem()}
      ${tw ? 'class="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"' : ''}
    />
    <button onclick={addItem}${tw ? ' class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"' : ''}>Add</button>
  </div>
  <ul${tw ? ' class="space-y-2"' : ''}>
    {#each items as item (item.id)}
      <li${tw ? ' class="flex items-center gap-3 p-3 bg-white rounded shadow-sm"' : ''}>
        <input type="checkbox" checked={item.completed} onchange={() => toggleItem(item.id)} />
        <span${tw ? ` class={item.completed ? 'flex-1 line-through text-gray-400' : 'flex-1'}` : ''}>{item.title}</span>
        <button onclick={() => removeItem(item.id)}${tw ? ' class="text-red-500 hover:text-red-700"' : ''}>Delete</button>
      </li>
    {/each}
  </ul>
  {#if items.length === 0}
    <p${tw ? ' class="text-gray-500 text-center py-8"' : ''}>No items yet. Add one above.</p>
  {/if}
</div>
`;
}

function generateSvelteIndexHtml(ctx: GeneratorContext): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ctx.selection.name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

// ─── Generator ─────────────────────────────────────────────────────

export function createFrontendGenerator(): Generator {
  return {
    name: 'frontend',
    description: 'Generates frontend project files including framework setup, CSS, state management, and sample CRUD components',

    async generate(ctx: GeneratorContext): Promise<GeneratorResult> {
      const frontend = getTech(ctx, 'frontend');
      if (!frontend) return { files: [] };

      const files: GeneratedFile[] = [];
      const commands: PostGenCommand[] = [];
      const prefix = 'frontend';

      // package.json
      files.push({ path: `${prefix}/package.json`, content: buildPackageJson(ctx) });

      // tsconfig.json
      files.push({ path: `${prefix}/tsconfig.json`, content: generateTsConfig(ctx) });

      // ── React ──
      if (hasTech(ctx, 'react') && !hasTech(ctx, 'nextjs')) {
        files.push({ path: `${prefix}/vite.config.ts`, content: generateViteConfig(ctx) });
        files.push({ path: `${prefix}/index.html`, content: generateIndexHtml(ctx) });
        files.push({ path: `${prefix}/src/main.tsx`, content: generateReactMain(ctx) });
        files.push({ path: `${prefix}/src/App.tsx`, content: generateReactApp(ctx) });

        if (hasTech(ctx, 'zustand')) {
          files.push({ path: `${prefix}/src/store/index.ts`, content: generateZustandStore() });
          files.push({ path: `${prefix}/src/components/ItemList.tsx`, content: generateItemListReactZustand(ctx) });
        } else if (hasTech(ctx, 'redux')) {
          files.push({ path: `${prefix}/src/store/index.ts`, content: generateReduxStore() });
          files.push({ path: `${prefix}/src/components/ItemList.tsx`, content: generateItemListReactRedux(ctx) });
        }
      }

      // ── Next.js ──
      if (hasTech(ctx, 'nextjs')) {
        files.push({ path: `${prefix}/next.config.ts`, content: generateNextConfig() });
        files.push({
          path: `${prefix}/src/app/layout.tsx`,
          content: `${hasTech(ctx, 'tailwind') ? "import './globals.css';\n" : ''}import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${ctx.selection.name}',
  description: '${ctx.selection.description ?? 'Generated by Constellation'}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>${hasTech(ctx, 'tailwind') ? '{children}' : `\n        {children}\n      `}</body>
    </html>
  );
}
`,
        });
        files.push({
          path: `${prefix}/src/app/page.tsx`,
          content: `export default function Home() {
  return (
    <main${hasTech(ctx, 'tailwind') ? ' className="min-h-screen bg-gray-50 p-8"' : ''}>
      <h1${hasTech(ctx, 'tailwind') ? ' className="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
      <p>Welcome to your new project.</p>
    </main>
  );
}
`,
        });

        if (hasTech(ctx, 'tailwind')) {
          files.push({ path: `${prefix}/src/app/globals.css`, content: generateTailwindCss() });
        }
      }

      // ── Vue ──
      if (hasTech(ctx, 'vue') && !hasTech(ctx, 'nuxt')) {
        files.push({ path: `${prefix}/vite.config.ts`, content: generateViteConfig(ctx) });
        files.push({ path: `${prefix}/index.html`, content: generateVueIndexHtml(ctx) });
        files.push({ path: `${prefix}/src/main.ts`, content: generateVueMain() });
        files.push({ path: `${prefix}/src/App.vue`, content: generateVueApp(ctx) });
        files.push({ path: `${prefix}/src/components/ItemList.vue`, content: generateVueItemList(ctx) });
      }

      // ── Nuxt ──
      if (hasTech(ctx, 'nuxt')) {
        files.push({
          path: `${prefix}/nuxt.config.ts`,
          content: `export default defineNuxtConfig({
  compatibilityDate: '2025-02-15',
  devtools: { enabled: true },${hasTech(ctx, 'tailwind') ? "\n  css: ['~/assets/css/main.css']," : ''}
});
`,
        });
        files.push({
          path: `${prefix}/app.vue`,
          content: `<template>
  <NuxtPage />
</template>
`,
        });
        files.push({
          path: `${prefix}/pages/index.vue`,
          content: generateVueApp(ctx),
        });
        files.push({
          path: `${prefix}/components/ItemList.vue`,
          content: generateVueItemList(ctx),
        });
        if (hasTech(ctx, 'tailwind')) {
          files.push({ path: `${prefix}/assets/css/main.css`, content: generateTailwindCss() });
        }
      }

      // ── Svelte ──
      if (hasTech(ctx, 'svelte')) {
        files.push({ path: `${prefix}/vite.config.ts`, content: generateViteConfig(ctx) });
        files.push({ path: `${prefix}/index.html`, content: generateSvelteIndexHtml(ctx) });
        files.push({ path: `${prefix}/src/main.ts`, content: generateSvelteMain() });
        files.push({ path: `${prefix}/src/App.svelte`, content: generateSvelteApp(ctx) });
        files.push({ path: `${prefix}/src/components/ItemList.svelte`, content: generateSvelteItemList(ctx) });
      }

      // ── Solid ──
      if (hasTech(ctx, 'solid')) {
        files.push({ path: `${prefix}/vite.config.ts`, content: generateViteConfig(ctx) });
        files.push({ path: `${prefix}/index.html`, content: generateIndexHtml(ctx) });
        files.push({
          path: `${prefix}/src/main.tsx`,
          content: `import { render } from 'solid-js/web';
import App from './App';

const root = document.getElementById('app');
if (!root) throw new Error('Root element not found');

render(() => <App />, root);
`,
        });
        files.push({
          path: `${prefix}/src/App.tsx`,
          content: `import type { Component } from 'solid-js';

const App: Component = () => {
  return (
    <div${hasTech(ctx, 'tailwind') ? ' class="min-h-screen bg-gray-50 p-8"' : ''}>
      <h1${hasTech(ctx, 'tailwind') ? ' class="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
      <p>Welcome to your new project.</p>
    </div>
  );
};

export default App;
`,
        });
      }

      // ── Astro ──
      if (hasTech(ctx, 'astro')) {
        files.push({
          path: `${prefix}/astro.config.mjs`,
          content: `import { defineConfig } from 'astro/config';

export default defineConfig({});
`,
        });
        files.push({
          path: `${prefix}/src/pages/index.astro`,
          content: `---
// ${ctx.selection.name}
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ctx.selection.name}</title>
  </head>
  <body${hasTech(ctx, 'tailwind') ? ' class="min-h-screen bg-gray-50 p-8"' : ''}>
    <h1${hasTech(ctx, 'tailwind') ? ' class="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
    <p>Welcome to your new project.</p>
  </body>
</html>
`,
        });
      }

      // ── Angular ──
      if (hasTech(ctx, 'angular')) {
        files.push({
          path: `${prefix}/src/main.ts`,
          content: `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
`,
        });
        files.push({
          path: `${prefix}/src/app/app.component.ts`,
          content: `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <div${hasTech(ctx, 'tailwind') ? ' class="min-h-screen bg-gray-50 p-8"' : ''}>
      <h1${hasTech(ctx, 'tailwind') ? ' class="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
      <p>Welcome to your new project.</p>
    </div>
  \`,
})
export class AppComponent {
  title = '${ctx.selection.name}';
}
`,
        });
      }

      // ── Qwik ──
      if (hasTech(ctx, 'qwik')) {
        files.push({ path: `${prefix}/vite.config.ts`, content: generateViteConfig(ctx) });
        files.push({
          path: `${prefix}/src/root.tsx`,
          content: `import { component$ } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div${hasTech(ctx, 'tailwind') ? ' class="min-h-screen bg-gray-50 p-8"' : ''}>
      <h1${hasTech(ctx, 'tailwind') ? ' class="text-3xl font-bold text-gray-900 mb-8"' : ''}>${ctx.selection.name}</h1>
      <p>Welcome to your new project.</p>
    </div>
  );
});
`,
        });
      }

      // ── Tailwind CSS ──
      if (hasTech(ctx, 'tailwind') && !hasTech(ctx, 'nextjs') && !hasTech(ctx, 'nuxt')) {
        files.push({ path: `${prefix}/tailwind.config.ts`, content: generateTailwindConfig() });
        files.push({ path: `${prefix}/postcss.config.js`, content: generatePostcssConfig() });
        files.push({ path: `${prefix}/src/index.css`, content: generateTailwindCss() });
      }

      // Post-gen commands
      commands.push({
        command: 'npm install',
        cwd: prefix,
        description: 'Install frontend dependencies',
      });

      return { files, commands };
    },
  };
}
