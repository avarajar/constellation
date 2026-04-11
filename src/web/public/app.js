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
  github: {
    mode: 'new',        // 'new' | 'existing' | 'none'
    org: null,           // selected org (null = personal)
    repoName: '',        // for new repo
    existingRepo: null,  // URL for existing repo
    username: '',        // GitHub username
    orgs: [],            // list of org names
  },
  homeDir: '',           // user's home directory from API
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

async function fetchHomeDir() {
  try {
    const data = await api('GET', '/api/home-dir');
    state.homeDir = data.homeDir || '';
  } catch {
    state.homeDir = '';
  }
}

async function fetchGithubOrgs() {
  try {
    const data = await api('GET', '/api/github/orgs');
    state.github.username = data.username || '';
    state.github.orgs = data.orgs || [];
  } catch {
    state.github.username = '';
    state.github.orgs = [];
  }
}

async function fetchGithubRepos(org, query) {
  const params = new URLSearchParams();
  if (org) params.set('org', org);
  if (query) params.set('q', query);
  const data = await api('GET', '/api/github/repos?' + params.toString());
  return data.repos || [];
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

// ── Directory Autocomplete ────────────────────────────────
async function fetchDirs(path) {
  try {
    const data = await api('GET', '/api/browse-dirs?path=' + encodeURIComponent(path));
    return data;
  } catch {
    return { dirs: [], parent: null };
  }
}

const debouncedDirAutocomplete = debounce(async (inputEl) => {
  const val = inputEl.value.trim();
  if (!val || val.length < 2) {
    hideDirAutocomplete();
    return;
  }

  const lastSlash = val.lastIndexOf('/');
  const parentPath = lastSlash > 0 ? val.substring(0, lastSlash) : '/';
  const partial = lastSlash >= 0 ? val.substring(lastSlash + 1).toLowerCase() : val.toLowerCase();

  const data = await fetchDirs(parentPath);
  const matches = data.dirs.filter(d => d.toLowerCase().startsWith(partial));

  const dropdown = document.getElementById('dirAutocomplete');
  if (!dropdown || matches.length === 0) {
    hideDirAutocomplete();
    return;
  }

  dropdown.innerHTML = matches.map(d =>
    `<div class="dir-autocomplete-item" data-path="${escHtml(parentPath + '/' + d)}">${escHtml(d)}/</div>`
  ).join('');
  dropdown.classList.remove('hidden');
}, 300);

function hideDirAutocomplete() {
  const dropdown = document.getElementById('dirAutocomplete');
  if (dropdown) dropdown.classList.add('hidden');
}

// ── Browse Directory Modal ────────────────────────────────
function openBrowseModal(currentPath, onSelect) {
  const existing = document.querySelector('.browse-modal');
  if (existing) existing.remove();

  let browsePath = currentPath || state.homeDir + '/projects';

  const modal = cloneTemplate('tpl-browse-modal');
  document.body.appendChild(modal);

  const breadcrumbEl = $('#browseBreadcrumb', modal);
  const listEl = $('#browseDirsList', modal);
  const closeBtn = $('.browse-modal-close', modal);
  const selectBtn = $('#btnSelectFolder', modal);
  const newFolderBtn = $('#btnNewFolder', modal);

  async function navigate(path) {
    browsePath = path;
    const data = await fetchDirs(path);
    renderBreadcrumb(path);
    renderDirList(data);
  }

  function renderBreadcrumb(path) {
    const parts = path.split('/').filter(Boolean);
    let html = '<span class="browse-crumb" data-path="/">/</span>';
    let accumulated = '';
    for (const part of parts) {
      accumulated += '/' + part;
      html += ` <span class="browse-crumb-sep">/</span> <span class="browse-crumb" data-path="${escHtml(accumulated)}">${escHtml(part)}</span>`;
    }
    breadcrumbEl.innerHTML = html;
  }

  function renderDirList(data) {
    if (data.parent) {
      listEl.innerHTML = `<div class="browse-dir-item browse-dir-parent" data-path="${escHtml(data.parent)}">&#11014; ..</div>`;
    } else {
      listEl.innerHTML = '';
    }

    if (data.dirs.length === 0) {
      listEl.innerHTML += '<div class="browse-dir-empty">No subdirectories</div>';
      return;
    }

    for (const dir of data.dirs) {
      const fullPath = browsePath.replace(/\/$/, '') + '/' + dir;
      listEl.innerHTML += `<div class="browse-dir-item" data-path="${escHtml(fullPath)}">&#128193; ${escHtml(dir)}</div>`;
    }
  }

  // Events
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();

    const crumb = e.target.closest('.browse-crumb');
    if (crumb) navigate(crumb.dataset.path);

    const dirItem = e.target.closest('.browse-dir-item');
    if (dirItem) navigate(dirItem.dataset.path);
  });

  closeBtn.addEventListener('click', () => modal.remove());

  selectBtn.addEventListener('click', () => {
    onSelect(browsePath);
    modal.remove();
  });

  newFolderBtn.addEventListener('click', async () => {
    const name = prompt('New folder name:');
    if (!name || !name.trim()) return;
    const newPath = browsePath.replace(/\/$/, '') + '/' + name.trim();
    try {
      await api('POST', '/api/create-dir', { path: newPath });
      navigate(browsePath);
      toast('Folder created: ' + name.trim(), 'success');
    } catch (err) {
      toast('Failed to create folder: ' + err.message, 'error');
    }
  });

  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', onKey);
    }
  });

  navigate(browsePath);
}

function getDefaultOutputDir(name) {
  const base = state.homeDir ? state.homeDir + '/projects' : '/tmp/projects';
  return name ? base + '/' + name : base;
}

function buildSelectionBody() {
  const sel = state.technologies.filter(t => state.selected.has(t.id));
  const body = {
    name: state.project.name,
    description: state.project.description || undefined,
    outputDir: state.project.outputDir || getDefaultOutputDir(state.project.name),
    mode: state.project.mode,
    monorepo: state.project.monorepo.enabled
      ? { enabled: true, tool: state.project.monorepo.tool || 'none' }
      : undefined,
    technologies: sel.map(t => ({ id: t.id, category: t.category })),
    github: {
      mode: state.github.mode,
      org: state.github.org || null,
      repoName: state.github.repoName || state.project.name,
      existingRepo: state.github.existingRepo || null,
    },
  };
  return body;
}

async function sendToClaudeCode() {
  return api('POST', '/api/blueprint', buildSelectionBody());
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
  const resolvedPathEl = $('#resolvedPath', section);
  const nextBtn = $('.btn-next', section);

  // Set default output dir if empty
  if (!state.project.outputDir && state.project.name) {
    state.project.outputDir = getDefaultOutputDir(state.project.name);
  }

  // Restore state
  nameInput.value = state.project.name;
  descInput.value = state.project.description;
  dirInput.value = state.project.outputDir;

  function updateResolvedPath() {
    const dir = dirInput.value || getDefaultOutputDir(state.project.name || 'my-app');
    resolvedPathEl.textContent = dir;
  }
  updateResolvedPath();

  // Directory autocomplete
  dirInput.addEventListener('input', () => {
    debouncedDirAutocomplete(dirInput);
  });

  dirInput.addEventListener('keydown', (e) => {
    const dropdown = document.getElementById('dirAutocomplete');
    if (e.key === 'Escape') {
      hideDirAutocomplete();
    }
    if (e.key === 'Tab' && dropdown && !dropdown.classList.contains('hidden')) {
      e.preventDefault();
      const first = dropdown.querySelector('.dir-autocomplete-item');
      if (first) {
        dirInput.value = first.dataset.path + '/';
        state.project.outputDir = dirInput.value;
        updateResolvedPath();
        hideDirAutocomplete();
        debouncedDirAutocomplete(dirInput);
      }
    }
  });

  // Autocomplete item click
  section.addEventListener('click', (e) => {
    const item = e.target.closest('.dir-autocomplete-item');
    if (item) {
      dirInput.value = item.dataset.path + '/';
      state.project.outputDir = dirInput.value;
      updateResolvedPath();
      hideDirAutocomplete();
      debouncedDirAutocomplete(dirInput);
      return; // prevent other click handlers
    }
  });

  // Hide autocomplete on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.output-dir-input-wrapper')) {
      hideDirAutocomplete();
    }
  });

  // Browse button
  const browseBtn = $('#btnBrowse', section);
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      const startPath = dirInput.value || getDefaultOutputDir(state.project.name || 'my-app');
      openBrowseModal(startPath, (selectedPath) => {
        dirInput.value = selectedPath;
        state.project.outputDir = selectedPath;
        updateResolvedPath();
      });
    });
  }

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

  // ── GitHub section ──
  const githubNewField = $('#githubNewField', section);
  const githubExistingField = $('#githubExistingField', section);
  const githubRepoNameInput = $('#githubRepoName', section);

  // Restore GitHub toggle state
  $$('[data-github]', section).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.github === state.github.mode);
    btn.setAttribute('aria-checked', btn.dataset.github === state.github.mode);
  });

  function updateGithubFieldVisibility() {
    githubNewField.classList.toggle('hidden', state.github.mode !== 'new');
    githubExistingField.classList.toggle('hidden', state.github.mode !== 'existing');
  }
  updateGithubFieldVisibility();

  // Populate GitHub org selector for "New Repo"
  function renderGithubOrgSelector() {
    const container = $('#githubOrgSelector', section);
    if (!state.github.username && state.github.orgs.length === 0) {
      container.innerHTML = '<span class="field-hint">GitHub CLI not available or not authenticated.</span>';
      return;
    }

    let html = '';
    // Personal account
    const isPersonal = !state.github.org;
    html += `<button class="github-org-btn ${isPersonal ? 'active' : ''}" data-org="">${escHtml(state.github.username)} <span class="github-org-label">Personal</span></button>`;
    // Orgs
    for (const org of state.github.orgs) {
      const isActive = state.github.org === org;
      html += `<button class="github-org-btn ${isActive ? 'active' : ''}" data-org="${escHtml(org)}">${escHtml(org)}</button>`;
    }
    container.innerHTML = html;
  }
  renderGithubOrgSelector();

  // Populate org dropdown for "Existing Repo"
  function renderExistingOrgDropdown() {
    const dropdown = $('#githubExistingOrg', section);
    let html = `<option value="">${escHtml(state.github.username || 'Personal')}</option>`;
    for (const org of state.github.orgs) {
      html += `<option value="${escHtml(org)}">${escHtml(org)}</option>`;
    }
    dropdown.innerHTML = html;
  }
  renderExistingOrgDropdown();

  // GitHub repo name
  githubRepoNameInput.value = state.github.repoName || state.project.name;

  // Existing repo search
  const repoSearchInput = $('#githubRepoSearch', section);
  const repoResultsEl = $('#githubRepoResults', section);
  const existingOrgDropdown = $('#githubExistingOrg', section);

  const debouncedRepoSearch = debounce(async () => {
    const q = repoSearchInput.value.trim();
    const org = existingOrgDropdown.value;
    if (!q) {
      repoResultsEl.innerHTML = '';
      return;
    }
    repoResultsEl.innerHTML = '<div class="github-repo-loading">Searching...</div>';
    try {
      const repos = await fetchGithubRepos(org, q);
      if (repos.length === 0) {
        repoResultsEl.innerHTML = '<div class="github-repo-loading">No repos found.</div>';
        return;
      }
      repoResultsEl.innerHTML = repos.map(r => `
        <button class="github-repo-result" data-repo-url="${escHtml(r.url)}" data-repo-name="${escHtml(r.name)}">
          <span class="github-repo-result-name">${escHtml(r.name)}</span>
          <span class="github-repo-result-desc">${escHtml(r.description || '')}</span>
        </button>
      `).join('');
    } catch {
      repoResultsEl.innerHTML = '<div class="github-repo-loading">Search failed.</div>';
    }
  }, 400);

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
      // Auto-update output dir unless user has customized it
      const defaultDir = getDefaultOutputDir(state.project.name);
      const prevDefault = getDefaultOutputDir('');
      if (!state.project.outputDir || state.project.outputDir.startsWith(prevDefault)) {
        dirInput.value = defaultDir;
        state.project.outputDir = defaultDir;
      }
      // Auto-update GitHub repo name
      if (githubRepoNameInput && state.github.mode === 'new') {
        githubRepoNameInput.value = state.project.name;
        state.github.repoName = state.project.name;
      }
      updateResolvedPath();
      checkNext();
    } else if (e.target === descInput) {
      state.project.description = descInput.value;
    } else if (e.target === dirInput) {
      state.project.outputDir = dirInput.value;
      updateResolvedPath();
    } else if (e.target === githubRepoNameInput) {
      state.github.repoName = githubRepoNameInput.value.trim();
    } else if (e.target === repoSearchInput) {
      debouncedRepoSearch();
    }
  });

  // Change event for the existing org dropdown
  if (existingOrgDropdown) {
    existingOrgDropdown.addEventListener('change', () => {
      debouncedRepoSearch();
    });
  }

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

    // GitHub mode toggle
    if (btn.dataset.github) {
      state.github.mode = btn.dataset.github;
      $$('[data-github]', section).forEach(b => {
        b.classList.toggle('active', b.dataset.github === state.github.mode);
        b.setAttribute('aria-checked', b.dataset.github === state.github.mode);
      });
      updateGithubFieldVisibility();
    }

    // GitHub org selector (new repo)
    if (btn.dataset.org !== undefined && btn.closest('#githubOrgSelector')) {
      state.github.org = btn.dataset.org || null;
      $$('.github-org-btn', section).forEach(b => {
        b.classList.toggle('active', (b.dataset.org || null) === (state.github.org || null));
      });
    }

    // GitHub existing repo result click
    if (btn.dataset.repoUrl !== undefined) {
      state.github.existingRepo = btn.dataset.repoUrl;
      const repoName = btn.dataset.repoName;
      // Update project name and output dir to match
      nameInput.value = repoName;
      state.project.name = repoName;
      dirInput.value = getDefaultOutputDir(repoName);
      state.project.outputDir = dirInput.value;
      updateResolvedPath();
      checkNext();
      // Highlight selected
      $$('.github-repo-result', section).forEach(r => r.classList.remove('selected'));
      btn.classList.add('selected');
      toast('Selected repo: ' + repoName, 'success');
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

  // Add "Add Custom" button next to the search bar
  const searchBar = $('.tech-search-bar', section);
  const addCustomBtn = document.createElement('button');
  addCustomBtn.className = 'custom-tech-btn';
  addCustomBtn.textContent = '\uFF0B Add Custom';
  addCustomBtn.addEventListener('click', () => openCustomTechModal(section));
  searchBar.appendChild(addCustomBtn);

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

// ── Custom Technology Modal ───────────────────────────────
function openCustomTechModal(section) {
  // Remove existing modal if any
  const existing = document.querySelector('.custom-tech-modal');
  if (existing) existing.remove();

  let selectedEcosystem = 'npm';
  let selectedCategory = 'backend';

  const modal = document.createElement('div');
  modal.className = 'custom-tech-modal';
  modal.innerHTML = `
    <div class="custom-tech-modal-content">
      <div class="custom-tech-modal-header">
        <h3>Add Custom Technology</h3>
        <button class="custom-tech-close">&times;</button>
      </div>

      <div class="ecosystem-selector" data-role="ecosystem">
        <button class="ecosystem-btn active" data-eco="npm">npm</button>
        <button class="ecosystem-btn" data-eco="pypi">PyPI</button>
        <button class="ecosystem-btn" data-eco="crates">Crates.io</button>
      </div>

      <div class="custom-tech-search-row">
        <input type="text" class="custom-tech-search-input" placeholder="Search packages..." autocomplete="off" spellcheck="false">
        <button class="custom-tech-search-btn">Search</button>
      </div>

      <div class="custom-tech-category-row">
        <label>Category:</label>
        <div class="ecosystem-selector" data-role="category">
          <button class="ecosystem-btn active" data-cat="backend">Backend</button>
          <button class="ecosystem-btn" data-cat="frontend">Frontend</button>
          <button class="ecosystem-btn" data-cat="database">Database</button>
          <button class="ecosystem-btn" data-cat="build">Build</button>
          <button class="ecosystem-btn" data-cat="testing-unit">Testing</button>
        </div>
      </div>

      <div class="custom-tech-results">
        <div class="custom-tech-empty">Search for a package above to get started.</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const searchInput = $('.custom-tech-search-input', modal);
  const searchBtn = $('.custom-tech-search-btn', modal);
  const resultsContainer = $('.custom-tech-results', modal);
  const closeBtn = $('.custom-tech-close', modal);

  // Close on backdrop or close button
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  closeBtn.addEventListener('click', () => modal.remove());

  // Escape to close
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', onKeyDown);
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // Ecosystem selector
  modal.addEventListener('click', (e) => {
    const ecoBtn = e.target.closest('[data-eco]');
    if (ecoBtn) {
      selectedEcosystem = ecoBtn.dataset.eco;
      const parent = ecoBtn.parentElement;
      $$('.ecosystem-btn', parent).forEach(b => b.classList.toggle('active', b === ecoBtn));
    }

    const catBtn = e.target.closest('[data-cat]');
    if (catBtn) {
      selectedCategory = catBtn.dataset.cat;
      const parent = catBtn.parentElement;
      $$('.ecosystem-btn', parent).forEach(b => b.classList.toggle('active', b === catBtn));
    }
  });

  // Search handler
  async function doSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    searchBtn.disabled = true;
    resultsContainer.innerHTML = `
      <div class="custom-tech-searching">
        <span class="spinner"></span>
        <span>Searching ${escHtml(selectedEcosystem)}...</span>
      </div>
    `;

    try {
      const data = await api('GET', `/api/search-online?q=${encodeURIComponent(query)}&ecosystem=${selectedEcosystem}`);

      if (data.error && data.results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="custom-tech-error">${escHtml(data.error)}</div>
        `;
      } else if (data.results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="custom-tech-empty">No packages found for "${escHtml(query)}".</div>
        `;
      } else {
        resultsContainer.innerHTML = '';
        for (const pkg of data.results) {
          const item = document.createElement('div');
          item.className = 'custom-tech-result';
          item.innerHTML = `
            <div class="custom-tech-result-head">
              <span class="custom-tech-result-name">${escHtml(pkg.name)}</span>
              <span class="custom-tech-result-version">${escHtml(pkg.version)}</span>
              <span class="custom-tech-result-eco">${escHtml(pkg.ecosystem)}</span>
            </div>
            <div class="custom-tech-result-desc">${escHtml(pkg.description)}</div>
          `;

          item.addEventListener('click', () => addCustomTechnology(pkg, selectedCategory, modal, section));
          resultsContainer.appendChild(item);
        }
      }
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="custom-tech-error">Search failed: ${escHtml(err.message)}</div>
      `;
    } finally {
      searchBtn.disabled = false;
    }
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  searchInput.focus();
}

async function addCustomTechnology(pkg, category, modal, section) {
  try {
    const result = await api('POST', '/api/add-technology', {
      id: pkg.id,
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      homepage: pkg.homepage,
      ecosystem: pkg.ecosystem,
      category: category,
    });

    if (result.success && result.technology) {
      // Add to local state
      const tech = result.technology;
      state.technologies.push(tech);

      // Ensure the technology appears in the appropriate group
      let placed = false;
      for (const group of state.groups) {
        for (const cat of group.categories) {
          if (cat.id === tech.category) {
            cat.technologies.push(tech);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      // If not placed in any existing group, create/add to a "Custom" group
      if (!placed) {
        let customGroup = state.groups.find(g => g.name === 'Custom');
        if (!customGroup) {
          customGroup = {
            name: 'Custom',
            description: 'Custom technologies added via online search',
            multiSelect: true,
            required: false,
            categories: [{ id: tech.category, technologies: [tech] }],
          };
          state.groups.push(customGroup);
        } else {
          let catEntry = customGroup.categories.find(c => c.id === tech.category);
          if (!catEntry) {
            catEntry = { id: tech.category, technologies: [] };
            customGroup.categories.push(catEntry);
          }
          catEntry.technologies.push(tech);
        }
      }

      // Auto-select the newly added technology
      state.selected.add(tech.id);

      // Close modal and re-render
      modal.remove();
      renderGroupSidebar(section);
      renderTechGrid(section);
      updateGroupCounts(section);

      toast(`Added "${tech.name}" to your stack`, 'success');
    }
  } catch (err) {
    toast('Failed to add technology: ' + err.message, 'error');
  }
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

  // Send to Claude Code button
  const genBtn = $('#btnGenerate', section);
  genBtn.addEventListener('click', async () => {
    if (state.generating) return;
    state.generating = true;
    genBtn.disabled = true;
    $('.btn-generate-text', genBtn).textContent = 'Saving blueprint...';
    $('.btn-generate-icon', genBtn).classList.add('hidden');
    $('.spinner', genBtn).classList.remove('hidden');

    try {
      const result = await sendToClaudeCode();
      showSuccess(section, result);
    } catch (err) {
      toast('Failed to save blueprint: ' + err.message, 'error');
      state.generating = false;
      genBtn.disabled = false;
      $('.btn-generate-text', genBtn).textContent = 'Send to Claude Code';
      $('.btn-generate-icon', genBtn).classList.remove('hidden');
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
      state.github.mode = 'new';
      state.github.org = null;
      state.github.repoName = '';
      state.github.existingRepo = null;
      state.selected = new Set();
      state.validation = null;
      state.searchQuery = '';
      state.generating = false;
      state.generationResult = null;
      render();
    }
    if (btn?.id === 'btnCopyPath') {
      const pathEl = $('#blueprintPathValue', section);
      if (pathEl) {
        navigator.clipboard.writeText(pathEl.textContent).then(() => {
          toast('Path copied to clipboard', 'success');
        }).catch(() => {
          toast('Failed to copy path', 'error');
        });
      }
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
  const bpPath = result.path || '';

  let html = `
    <p class="success-detail success-path-label">Path:</p>
    <p class="success-detail"><code id="blueprintPathValue" class="success-path-code">${escHtml(bpPath)}</code></p>
    <div class="success-next-steps">
      <p>Go back to <strong>Claude Code</strong> — generation will start automatically.</p>
    </div>
  `;

  details.innerHTML = html;
}

// ── Navigation ─────────────────────────────────────────────
function nextStep() {
  if (state.step === 1) {
    if (!state.project.name) return;
    if (!state.project.outputDir) {
      state.project.outputDir = getDefaultOutputDir(state.project.name);
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
    await Promise.all([
      fetchTechnologies(),
      fetchHomeDir(),
      fetchGithubOrgs(),
    ]);
  } catch (err) {
    console.error('Failed to load initial data:', err);
    toast('Could not load data from API. The server may not be running.', 'warning');
  }

  render();
}

document.addEventListener('DOMContentLoaded', init);
