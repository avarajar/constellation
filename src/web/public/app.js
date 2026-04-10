/* ═══════════════════════════════════════════════════════════
   Constellation — app.js
   Single-page wizard: Setup -> Tech Selection -> Generate
   ═══════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────
const state = {
  step: 1,
  project: {
    name: '',
    description: '',
    outputDir: '',
    mode: 'new',
    monorepo: { enabled: false, tool: null },
  },
  groups: [],            // TechCategoryGroup[] with nested categories & techs
  technologies: [],      // flat list of all Technology objects
  selected: new Set(),   // selected tech IDs
  validation: null,      // { valid, errors, warnings }
  activeGroup: null,     // currently viewed category group name
  searchQuery: '',
  generating: false,
  generationResult: null,
};

// ── Tech icon map ──────────────────────────────────────────
const TECH_ICONS = {
  react: '\u269B',       // ⚛
  vue: '\uD83D\uDC9A',   // 💚
  svelte: '\uD83D\uDD25', // 🔥
  'next.js': '\u25B2',   // ▲
  nextjs: '\u25B2',
  angular: '\uD83C\uDD70', // 🅰
  astro: '\uD83D\uDE80', // 🚀
  'node.js': '\uD83D\uDFE2',
  nodejs: '\uD83D\uDFE2',
  express: '\uD83D\uDFE2',
  fastify: '\uD83D\uDFE2',
  hono: '\uD83D\uDFE2',
  koa: '\uD83D\uDFE2',
  nestjs: '\uD83D\uDFE2',
  python: '\uD83D\uDC0D',
  django: '\uD83D\uDC0D',
  flask: '\uD83D\uDC0D',
  fastapi: '\uD83D\uDC0D',
  go: '\uD83D\uDC39',
  rust: '\uD83E\uDD80',
  java: '\u2615',
  spring: '\u2615',
  '.net': '\uD83D\uDD37',
  dotnet: '\uD83D\uDD37',
  postgresql: '\uD83D\uDC18',
  postgres: '\uD83D\uDC18',
  mysql: '\uD83D\uDC2C',
  mariadb: '\uD83E\uDDAD',
  mongodb: '\uD83C\uDF43',
  redis: '\uD83D\uDD34',
  docker: '\uD83D\uDC33',
  kubernetes: '\u2638',
  aws: '\u2601',
  gcp: '\u2601',
  azure: '\u2601',
  terraform: '\uD83C\uDFD7\uFE0F',
  jest: '\uD83E\uDDEA',
  vitest: '\uD83E\uDDEA',
  mocha: '\uD83E\uDDEA',
  playwright: '\uD83E\uDDEA',
  cypress: '\uD83E\uDDEA',
  testing: '\uD83E\uDDEA',
  prometheus: '\uD83D\uDCCA',
  grafana: '\uD83D\uDCCA',
  datadog: '\uD83D\uDCCA',
  sentry: '\uD83D\uDCCA',
  monitoring: '\uD83D\uDCCA',
};

const GROUP_ICONS = {
  frontend: '\uD83C\uDF10',    // 🌐
  backend: '\u2699\uFE0F',     // ⚙️
  database: '\uD83D\uDDC4\uFE0F', // 🗄️
  infrastructure: '\uD83D\uDC33', // 🐳
  testing: '\uD83E\uDDEA',     // 🧪
  monitoring: '\uD83D\uDCCA',  // 📊
};

// ── Helpers ────────────────────────────────────────────────
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  return tpl.content.firstElementChild.cloneNode(true);
}

function techIcon(tech) {
  const id = (tech.id || '').toLowerCase();
  const name = (tech.name || '').toLowerCase();
  return TECH_ICONS[id] || TECH_ICONS[name] || '\u26A1'; // ⚡ default
}

function groupIcon(name) {
  return GROUP_ICONS[(name || '').toLowerCase()] || '\u26A1';
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── API ────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

async function fetchTechnologies() {
  const data = await api('GET', '/api/technologies');
  state.groups = data.groups || [];
  // Flatten
  state.technologies = [];
  for (const g of state.groups) {
    for (const cat of g.categories) {
      for (const t of cat.technologies) {
        state.technologies.push(t);
      }
    }
  }
  if (state.groups.length && !state.activeGroup) {
    state.activeGroup = state.groups[0].name;
  }
}

const debouncedValidate = debounce(async () => {
  if (state.selected.size === 0) {
    state.validation = { valid: true, errors: [], warnings: [] };
    renderValidationBadges();
    return;
  }
  try {
    state.validation = await api('POST', '/api/validate', {
      technologies: [...state.selected],
    });
  } catch {
    state.validation = null;
  }
  renderValidationBadges();
}, 300);

async function generate() {
  const sel = state.technologies.filter(t => state.selected.has(t.id));
  const body = {
    name: state.project.name,
    description: state.project.description || undefined,
    outputDir: state.project.outputDir || './' + state.project.name,
    mode: state.project.mode,
    monorepo: state.project.monorepo.enabled
      ? { enabled: true, tool: state.project.monorepo.tool || 'none' }
      : undefined,
    technologies: sel.map(t => ({ id: t.id, category: t.category })),
  };
  return api('POST', '/api/generate', body);
}

// ── Toast Notifications ────────────────────────────────────
function toast(message, type = 'error') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, 4000);
}

// ── Render Engine ──────────────────────────────────────────
const app = document.getElementById('app');

function render() {
  app.innerHTML = '';
  updateStepper();

  switch (state.step) {
    case 1: renderStep1(); break;
    case 2: renderStep2(); break;
    case 3: renderStep3(); break;
  }
}

function updateStepper() {
  $$('.stepper-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === state.step);
    el.classList.toggle('done', s < state.step);
  });
}

// ── Step 1: Project Setup ──────────────────────────────────
function renderStep1() {
  const section = cloneTemplate('tpl-step1');
  app.appendChild(section);

  const nameInput = $('#projectName', section);
  const descInput = $('#projectDesc', section);
  const dirInput = $('#outputDir', section);
  const nextBtn = $('.btn-next', section);

  // Restore state
  nameInput.value = state.project.name;
  descInput.value = state.project.description;
  dirInput.value = state.project.outputDir;

  // Mode toggle
  $$('[data-mode]', section).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.project.mode);
    btn.setAttribute('aria-checked', btn.dataset.mode === state.project.mode);
  });

  // Monorepo toggle
  $$('[data-monorepo]', section).forEach(btn => {
    const val = btn.dataset.monorepo === 'true';
    btn.classList.toggle('active', val === state.project.monorepo.enabled);
  });

  // Monorepo tool
  const toolField = $('.monorepo-tool-field', section);
  if (state.project.monorepo.enabled) toolField.classList.remove('hidden');
  if (state.project.monorepo.tool) {
    $$('[data-monorepo-tool]', section).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.monorepoTool === state.project.monorepo.tool);
    });
  }

  // Validate next
  function checkNext() {
    const valid = nameInput.value.trim().length > 0 && /^[a-z0-9][a-z0-9._-]*$/i.test(nameInput.value.trim());
    nextBtn.disabled = !valid;
  }
  checkNext();

  // Events via delegation
  section.addEventListener('input', (e) => {
    if (e.target === nameInput) {
      state.project.name = nameInput.value.trim();
      if (!state.project.outputDir || state.project.outputDir.startsWith('./')) {
        dirInput.value = './' + state.project.name;
        state.project.outputDir = dirInput.value;
      }
      checkNext();
    } else if (e.target === descInput) {
      state.project.description = descInput.value;
    } else if (e.target === dirInput) {
      state.project.outputDir = dirInput.value;
    }
  });

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.mode) {
      state.project.mode = btn.dataset.mode;
      $$('[data-mode]', section).forEach(b => {
        b.classList.toggle('active', b.dataset.mode === state.project.mode);
        b.setAttribute('aria-checked', b.dataset.mode === state.project.mode);
      });
    }

    if (btn.dataset.monorepo !== undefined) {
      state.project.monorepo.enabled = btn.dataset.monorepo === 'true';
      $$('[data-monorepo]', section).forEach(b => {
        b.classList.toggle('active', (b.dataset.monorepo === 'true') === state.project.monorepo.enabled);
      });
      toolField.classList.toggle('hidden', !state.project.monorepo.enabled);
    }

    if (btn.dataset.monorepoTool) {
      state.project.monorepo.tool = btn.dataset.monorepoTool;
      $$('[data-monorepo-tool]', section).forEach(b => {
        b.classList.toggle('active', b.dataset.monorepoTool === state.project.monorepo.tool);
      });
    }

    if (btn.dataset.dir === 'next') nextStep();
  });

  // Keyboard: Enter to proceed
  section.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !nextBtn.disabled) nextStep();
  });

  nameInput.focus();
}

// ── Step 2: Technology Selection ───────────────────────────
function renderStep2() {
  const section = cloneTemplate('tpl-step2');
  app.appendChild(section);

  renderGroupSidebar(section);
  renderTechGrid(section);

  const searchInput = $('#techSearch', section);
  searchInput.value = state.searchQuery;

  // Search
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value;
    renderTechGrid(section);
  });

  // Delegation for card clicks & nav
  section.addEventListener('click', (e) => {
    const card = e.target.closest('.tech-card');
    if (card && card.dataset.techId) {
      toggleTech(card.dataset.techId);
      renderTechGrid(section);
      updateGroupCounts(section);
      return;
    }

    const tab = e.target.closest('.group-tab');
    if (tab && tab.dataset.group) {
      state.activeGroup = tab.dataset.group;
      state.searchQuery = '';
      searchInput.value = '';
      renderGroupSidebar(section);
      renderTechGrid(section);
      return;
    }

    const btn = e.target.closest('button');
    if (btn?.dataset.dir === 'next') nextStep();
    if (btn?.dataset.dir === 'prev') prevStep();
  });

  // Keyboard nav inside grid
  section.addEventListener('keydown', (e) => {
    if (e.target.closest('.tech-card') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const card = e.target.closest('.tech-card');
      toggleTech(card.dataset.techId);
      renderTechGrid(section);
      updateGroupCounts(section);
    }
  });
}

function renderGroupSidebar(section) {
  const sidebar = $('.group-sidebar', section);
  sidebar.innerHTML = '';

  for (const group of state.groups) {
    const count = countSelectedInGroup(group);
    const btn = document.createElement('button');
    btn.className = 'group-tab' + (group.name === state.activeGroup ? ' active' : '');
    btn.dataset.group = group.name;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', group.name === state.activeGroup);
    btn.innerHTML = `
      <span class="group-tab-icon">${groupIcon(group.name)}</span>
      <span>${group.name}</span>
      <span class="group-tab-count ${count > 0 ? 'visible' : ''}">${count}</span>
    `;
    sidebar.appendChild(btn);
  }
}

function renderTechGrid(section) {
  const grid = $('#techGrid', section);
  grid.innerHTML = '';

  const query = state.searchQuery.toLowerCase().trim();
  const group = state.groups.find(g => g.name === state.activeGroup);
  if (!group) return;

  // Gather conflicting tech IDs from validation
  const conflictIds = new Set();
  if (state.validation && !state.validation.valid) {
    // Mark techs mentioned in errors — a simplistic approach
    // We'll just show the badge; the real logic is in the API
  }

  let visibleCount = 0;

  for (const cat of group.categories) {
    const techs = cat.technologies.filter(t => {
      if (!query) return true;
      return t.name.toLowerCase().includes(query)
        || t.id.toLowerCase().includes(query)
        || (t.description || '').toLowerCase().includes(query)
        || (t.tags || []).some(tag => tag.toLowerCase().includes(query));
    });

    if (techs.length === 0) continue;

    // Category label (use readable form of the category key)
    const label = document.createElement('div');
    label.className = 'tech-category-label';
    label.textContent = formatCategoryName(cat.id);
    grid.appendChild(label);

    // Cards sub-grid wrapper
    const subgrid = document.createElement('div');
    subgrid.className = 'tech-grid';
    grid.appendChild(subgrid);

    for (const tech of techs) {
      visibleCount++;
      const isSelected = state.selected.has(tech.id);
      const isConflict = conflictIds.has(tech.id);

      const card = document.createElement('div');
      card.className = 'tech-card' + (isSelected ? ' selected' : '') + (isConflict ? ' conflict' : '');
      card.dataset.techId = tech.id;
      card.dataset.fullDesc = tech.description || '';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', isSelected);

      const tagsHtml = (tech.tags || []).slice(0, 3).map(t =>
        `<span class="tech-tag">${escHtml(t)}</span>`
      ).join('');

      card.innerHTML = `
        <div class="tech-card-head">
          <span class="tech-icon">${techIcon(tech)}</span>
          <span class="tech-name">${escHtml(tech.name)}</span>
          <span class="tech-version">${escHtml(tech.version || '')}</span>
        </div>
        <div class="tech-desc">${escHtml(tech.description || '')}</div>
        <div class="tech-tags">${tagsHtml}</div>
        <div class="tech-check">\u2713</div>
        ${isConflict ? '<div class="tech-conflict-badge">Conflict</div>' : ''}
      `;

      subgrid.appendChild(card);
    }
  }

  // No results
  if (visibleCount === 0) {
    grid.innerHTML = `
      <div class="tech-no-results">
        <div class="tech-no-results-icon">\uD83D\uDD0D</div>
        <p>No technologies match "${escHtml(query)}"</p>
      </div>
    `;
  }

  // Search count
  const countEl = $('#searchCount', section);
  if (countEl) {
    countEl.textContent = query ? `${visibleCount} result${visibleCount !== 1 ? 's' : ''}` : '';
  }
}

function renderValidationBadges() {
  // Update conflict classes on visible cards if step 2 is active
  if (state.step !== 2) return;

  const v = state.validation;
  if (!v) return;

  // Show toast for new errors/warnings
  if (v.errors?.length) {
    for (const err of v.errors) toast(err, 'error');
  }
  if (v.warnings?.length) {
    for (const w of v.warnings) toast(w, 'warning');
  }
}

function updateGroupCounts(section) {
  $$('.group-tab', section).forEach(tab => {
    const group = state.groups.find(g => g.name === tab.dataset.group);
    if (!group) return;
    const count = countSelectedInGroup(group);
    const badge = $('.group-tab-count', tab);
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  });
}

function countSelectedInGroup(group) {
  let count = 0;
  for (const cat of group.categories) {
    for (const t of cat.technologies) {
      if (state.selected.has(t.id)) count++;
    }
  }
  return count;
}

// ── Step 3: Review & Generate ──────────────────────────────
function renderStep3() {
  const section = cloneTemplate('tpl-step3');
  app.appendChild(section);

  // Summary
  const summaryEl = $('#reviewSummary', section);
  for (const group of state.groups) {
    const techs = [];
    for (const cat of group.categories) {
      for (const t of cat.technologies) {
        if (state.selected.has(t.id)) techs.push(t);
      }
    }
    if (techs.length === 0) continue;

    const card = document.createElement('div');
    card.className = 'review-group';
    card.innerHTML = `
      <div class="review-group-title">${groupIcon(group.name)} ${escHtml(group.name)}</div>
      ${techs.map(t => `
        <div class="review-tech-item">
          <span class="review-tech-icon">${techIcon(t)}</span>
          <span class="review-tech-name">${escHtml(t.name)}</span>
          <span class="review-tech-ver">${escHtml(t.version || '')}</span>
        </div>
      `).join('')}
    `;
    summaryEl.appendChild(card);
  }

  if (state.selected.size === 0) {
    summaryEl.innerHTML = '<p style="color:var(--text-muted)">No technologies selected. Go back to add some.</p>';
  }

  // Validation
  const valEl = $('#reviewValidation', section);
  renderReviewValidation(valEl);

  // Tree preview
  renderProjectTree(section);

  // Generate button
  const genBtn = $('#btnGenerate', section);
  genBtn.addEventListener('click', async () => {
    if (state.generating) return;
    state.generating = true;
    genBtn.disabled = true;
    $('.btn-generate-text', genBtn).textContent = 'Generating...';
    $('.spinner', genBtn).classList.remove('hidden');

    try {
      const result = await generate();
      state.generationResult = result;
      showSuccess(section, result);
    } catch (err) {
      toast('Generation failed: ' + err.message, 'error');
      state.generating = false;
      genBtn.disabled = false;
      $('.btn-generate-text', genBtn).textContent = 'Generate Project';
      $('.spinner', genBtn).classList.add('hidden');
    }
  });

  // Nav
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn?.dataset.dir === 'prev') prevStep();
    if (btn?.id === 'btnNewProject') {
      // Reset
      state.step = 1;
      state.project = { name: '', description: '', outputDir: '', mode: 'new', monorepo: { enabled: false, tool: null } };
      state.selected = new Set();
      state.validation = null;
      state.searchQuery = '';
      state.generating = false;
      state.generationResult = null;
      render();
    }
  });
}

function renderReviewValidation(container) {
  const v = state.validation;
  if (!v) {
    container.innerHTML = '<p style="color:var(--text-muted)">Validation not yet performed.</p>';
    return;
  }

  let html = '';

  if (v.valid && (!v.errors || v.errors.length === 0)) {
    html += '<div class="validation-ok"><span>\u2705</span> All selections are compatible</div>';
  }

  if (v.errors?.length) {
    for (const err of v.errors) {
      html += `<div class="validation-error"><span class="validation-icon">\u274C</span><span>${escHtml(err)}</span></div>`;
    }
  }

  if (v.warnings?.length) {
    for (const w of v.warnings) {
      html += `<div class="validation-warning"><span class="validation-icon">\u26A0\uFE0F</span><span>${escHtml(w)}</span></div>`;
    }
  }

  container.innerHTML = html;
}

function renderProjectTree(section) {
  const treeEl = $('#projectTree', section);
  const name = state.project.name || 'project';
  const selectedTechs = state.technologies.filter(t => state.selected.has(t.id));
  const categories = new Set(selectedTechs.map(t => t.category));

  let lines = [`${name}/`];
  lines.push('\u251C\u2500\u2500 package.json');
  lines.push('\u251C\u2500\u2500 .gitignore');

  if (selectedTechs.some(t => t.language === 'typescript' || (t.tags || []).includes('TypeScript'))) {
    lines.push('\u251C\u2500\u2500 tsconfig.json');
  }

  if (categories.has('frontend') || categories.has('css') || categories.has('build') || categories.has('state')) {
    lines.push('\u251C\u2500\u2500 src/');
    lines.push('\u2502   \u251C\u2500\u2500 components/');
    lines.push('\u2502   \u251C\u2500\u2500 pages/');
    lines.push('\u2502   \u251C\u2500\u2500 styles/');
    lines.push('\u2502   \u2514\u2500\u2500 index.ts');
  }

  if (categories.has('backend') || categories.has('orm')) {
    lines.push('\u251C\u2500\u2500 server/');
    lines.push('\u2502   \u251C\u2500\u2500 routes/');
    lines.push('\u2502   \u251C\u2500\u2500 middleware/');
    lines.push('\u2502   \u2514\u2500\u2500 index.ts');
  }

  if (categories.has('database') || categories.has('orm') || categories.has('cache')) {
    lines.push('\u251C\u2500\u2500 db/');
    lines.push('\u2502   \u251C\u2500\u2500 migrations/');
    lines.push('\u2502   \u2514\u2500\u2500 schema.ts');
  }

  if (categories.has('containerization') || categories.has('orchestration') || categories.has('cloud') || categories.has('cicd')) {
    lines.push('\u251C\u2500\u2500 infra/');
    if (selectedTechs.some(t => t.id.includes('docker') || t.category === 'containerization')) {
      lines.push('\u2502   \u251C\u2500\u2500 Dockerfile');
      lines.push('\u2502   \u251C\u2500\u2500 docker-compose.yml');
    }
    if (selectedTechs.some(t => t.id.includes('terraform'))) {
      lines.push('\u2502   \u251C\u2500\u2500 main.tf');
    }
    if (categories.has('cicd')) {
      lines.push('\u2502   \u2514\u2500\u2500 .github/workflows/');
    }
  }

  if (categories.has('testing-unit') || categories.has('testing-e2e') || categories.has('testing-api')) {
    lines.push('\u251C\u2500\u2500 tests/');
    lines.push('\u2502   \u251C\u2500\u2500 unit/');
    if (categories.has('testing-e2e')) lines.push('\u2502   \u251C\u2500\u2500 e2e/');
    if (categories.has('testing-api')) lines.push('\u2502   \u2514\u2500\u2500 api/');
  }

  if (categories.has('observability') || categories.has('logging') || categories.has('error-tracking')) {
    lines.push('\u251C\u2500\u2500 monitoring/');
  }

  if (state.project.monorepo?.enabled) {
    lines.push('\u251C\u2500\u2500 packages/');
    if (state.project.monorepo.tool === 'turborepo') lines.push('\u251C\u2500\u2500 turbo.json');
    if (state.project.monorepo.tool === 'nx') lines.push('\u251C\u2500\u2500 nx.json');
  }

  lines.push('\u2514\u2500\u2500 README.md');

  treeEl.textContent = lines.join('\n');
}

function showSuccess(section, result) {
  const overlay = $('#successOverlay', section);
  overlay.classList.remove('hidden');

  const details = $('#successDetails', section);
  const fileCount = result.files?.length || 0;
  const dir = result.outputDir || state.project.outputDir || './' + state.project.name;

  let html = `
    <p class="success-detail"><strong>${fileCount}</strong> files generated</p>
    <p class="success-detail">Output: <code>${escHtml(dir)}</code></p>
    <div class="success-next-steps">
      <p><strong>Next steps:</strong></p>
      <pre><code>cd ${escHtml(dir)}\nnpm install\nnpm run dev</code></pre>
    </div>
  `;

  if (result.messages?.length) {
    html += '<ul class="success-messages">';
    for (const msg of result.messages) {
      html += `<li>${escHtml(msg)}</li>`;
    }
    html += '</ul>';
  }

  details.innerHTML = html;

  // Confetti
  launchConfetti($('#confettiCanvas', section));
}

// ── Confetti ───────────────────────────────────────────────
function launchConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#7c5cff', '#9678ff', '#00d4aa', '#ffb347', '#ff5757', '#e8e8f0'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 8 + 4,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - .5) * 4,
    vy: Math.random() * 3 + 2,
    rot: Math.random() * 360,
    rv: (Math.random() - .5) * 8,
    opacity: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rv;
      p.vy += 0.04; // gravity

      if (frame > 60) p.opacity -= 0.008;
      if (p.opacity <= 0) continue;
      alive = true;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    frame++;
    if (alive && frame < 300) requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

// ── Navigation ─────────────────────────────────────────────
function nextStep() {
  if (state.step === 1) {
    if (!state.project.name) return;
    if (!state.project.outputDir) {
      state.project.outputDir = './' + state.project.name;
    }
  }

  if (state.step < 3) {
    state.step++;
    render();

    // Trigger validation when entering step 2 or 3
    if (state.step >= 2) debouncedValidate();
  }
}

function prevStep() {
  if (state.step > 1) {
    state.step--;
    render();
  }
}

// ── Tech toggle ────────────────────────────────────────────
function toggleTech(id) {
  if (state.selected.has(id)) {
    state.selected.delete(id);
  } else {
    state.selected.add(id);
  }
  debouncedValidate();
}

// ── Utility ────────────────────────────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatCategoryName(cat) {
  return cat
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  // Show loading
  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
      <p>Loading technologies...</p>
    </div>
  `;

  try {
    await fetchTechnologies();
  } catch (err) {
    console.error('Failed to load technologies:', err);
    // Still allow the wizard to work; step 2 will just be empty
    toast('Could not load technologies from API. The server may not be running.', 'warning');
  }

  render();
}

document.addEventListener('DOMContentLoaded', init);
