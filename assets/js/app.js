const SITE = {
  title: 'QPet Games',
  sourceRepo: 'https://github.com/QPetLover/awesome-qpet-games',
  adventureRepo: 'https://github.com/QPetLover/qpet-adventure',
  adventureSite: 'https://qpetlover.cn/qpet-adventure/',
};

const state = {
  data: null,
  games: [],
  route: 'home',
  params: {},
  filter: 'all',
  query: '',
};

let rufflePromise = null;

const view = () => document.getElementById('view');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function encodePath(path = '') {
  return path.split('/').map(encodeURIComponent).join('/');
}

function sourceHref(game) {
  if (!game.sourceRepoPath) return SITE.sourceRepo;
  const path = game.sourceRepoPath.replace(/^source\/awesome-qpet-games\//, '');
  return `${SITE.sourceRepo}/blob/main/${encodePath(path)}`;
}

function routeTo(hash = window.location.hash) {
  const raw = hash.replace(/^#\/?/, '') || 'home';
  const [path, queryString = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const search = new URLSearchParams(queryString);

  state.route = parts[0] || 'home';
  state.params = {
    id: decodeURIComponent(parts[1] || ''),
    kind: search.get('kind') || search.get('tab') || 'all',
    search: search.get('search') || '',
  };
}

function gameById(id) {
  return state.games.find((game) => game.id === id);
}

function gamesByTitle(title) {
  return state.games.filter((game) => game.title === title || game.baseTitle === title);
}

function setActiveNav() {
  document.querySelectorAll('[data-nav]').forEach((node) => {
    node.classList.toggle('is-active', node.dataset.nav === state.route || (state.route === 'home' && node.dataset.nav === 'home'));
  });
}

function render() {
  if (!state.data) {
    view().innerHTML = '<div class="skeleton">正在整理宠物社区的小游戏卡片...</div>';
    return;
  }

  setActiveNav();
  if (state.route === 'games') return renderCatalog();
  if (state.route === 'game') return renderDetail(state.params.id);
  if (state.route === 'play') return renderPlayer(state.params.id);
  if (state.route === 'lab') return renderLab();
  return renderHome();
}

function renderHome() {
  const playable = state.games.filter((game) => game.playable).length;
  const classic = state.games.filter((game) => game.kind === 'classic').length;
  const missing = state.games.filter((game) => !game.playable).length;
  const featured = state.games.filter((game) => game.playable).slice(0, 3);

  view().innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Flash Archive / Ruffle Ready</p>
        <h1>QQ 宠物<br><span>小游戏</span>馆</h1>
        <p class="hero-lede">把古早 HTML 页面升级成可检索、可运行、可继续接入 source 仓库的静态小游戏站。冒险岛已经拆到独立仓库，这里专注小游戏和相关体验。</p>
        <div class="hero-actions">
          <a class="primary-button" href="#/games">进入游戏馆</a>
          <a class="ghost-button" href="#/lab">上传 SWF 试跑</a>
          <a class="ghost-button" href="${SITE.sourceRepo}" target="_blank" rel="noreferrer">资源归档</a>
        </div>
      </div>
      <div class="hero-panel" aria-label="QQ 宠物小游戏数据概览">
        <div class="pixel-pet" aria-hidden="true"></div>
        <div class="hero-stats">
          <div class="stat-chip"><span>可运行</span><strong>${playable}</strong></div>
          <div class="stat-chip"><span>待补档</span><strong>${missing}</strong></div>
          <div class="stat-chip"><span>经典索引</span><strong>${classic}</strong></div>
        </div>
      </div>
    </section>
    <section class="section-grid" aria-label="入口">
      ${featured.map((game) => `
        <article class="section-card">
          <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}">
          <p class="eyebrow">${escapeHtml(game.kindLabel)} · ${escapeHtml(game.statusLabel)}</p>
          <h2>${escapeHtml(game.title)}</h2>
          <p>来自 ${escapeHtml(game.baseTitle)} 的可运行 SWF，已接入 Ruffle 播放页。</p>
          <a class="primary-button" href="#/play/${encodeURIComponent(game.id)}">马上运行</a>
        </article>
      `).join('')}
    </section>
    <section class="section-grid" aria-label="项目分工">
      <article class="section-card">
        <p class="eyebrow">Source</p>
        <h2>资源仓库作源头</h2>
        <p>本仓库通过 submodule 引用 `awesome-qpet-games`，后续 ChatQPet 发版后可继续替换成更完整的资源源。</p>
        <a class="ghost-button" href="${SITE.sourceRepo}" target="_blank" rel="noreferrer">查看 awesome-qpet-games</a>
      </article>
      <article class="section-card">
        <p class="eyebrow">Adventure</p>
        <h2>冒险岛独立部署</h2>
        <p>QQ 宠物冒险岛不再混在小游戏站入口内，跳转到独立仓库和独立 Pages 站点。</p>
        <a class="ghost-button" href="${SITE.adventureSite}" target="_blank" rel="noreferrer">打开冒险岛</a>
      </article>
      <article class="section-card">
        <p class="eyebrow">Ruffle</p>
        <h2>Flash 安全运行</h2>
        <p>小游戏通过 Ruffle 运行；无法确认来源的 SWF 会显示补档状态，不再给用户一个必然失败的点击入口。</p>
        <a class="ghost-button" href="#/games?kind=missing">查看待补档</a>
      </article>
    </section>
  `;
}

function renderCatalog() {
  state.filter = state.params.kind || 'all';
  state.query = state.params.search || '';

  view().innerHTML = `
    <section class="page-heading">
      <p class="eyebrow">Catalog</p>
      <h1>小游戏<br><span>列表</span></h1>
      <p>按可运行状态、经典索引、换壳平替筛选。点击卡片进入详情；只有资源已经对齐的游戏会出现运行按钮。</p>
    </section>
    <section class="catalog-tools">
      <input id="game-search" class="search-input" type="search" value="${escapeHtml(state.query)}" placeholder="搜索游戏名、原型或标签">
      <div class="filter-pills" role="tablist" aria-label="游戏筛选">
        ${filterButton('all', '全部')}
        ${filterButton('playable', '可运行')}
        ${filterButton('reskin', '换壳平替')}
        ${filterButton('classic', '经典索引')}
        ${filterButton('missing', '待补档')}
      </div>
    </section>
    <section id="catalog-grid" class="catalog-grid" aria-live="polite"></section>
  `;

  const searchInput = document.getElementById('game-search');
  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    paintCatalogGrid();
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((node) => node.classList.toggle('is-active', node === button));
      paintCatalogGrid();
    });
  });

  paintCatalogGrid();
}

function filterButton(value, label) {
  const active = state.filter === value ? ' is-active' : '';
  return `<button class="pill-button${active}" data-filter="${value}" type="button">${label}</button>`;
}

function filteredGames() {
  const query = state.query.toLowerCase();
  return state.games.filter((game) => {
    const matchesFilter =
      state.filter === 'all' ||
      (state.filter === 'playable' && game.playable) ||
      (state.filter === 'missing' && !game.playable) ||
      game.kind === state.filter;
    const haystack = [game.title, game.baseTitle, game.kindLabel, game.statusLabel, ...(game.tags || [])].join(' ').toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
}

function paintCatalogGrid() {
  const grid = document.getElementById('catalog-grid');
  const games = filteredGames();
  if (!games.length) {
    grid.innerHTML = '<div class="empty-state">没有找到匹配的小游戏。换一个关键词试试。</div>';
    return;
  }

  grid.innerHTML = games.map((game, index) => `
    <article class="catalog-card" style="animation-delay: ${Math.min(index * 35, 420)}ms">
      <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}">
      <div class="card-body">
        <div class="card-meta">
          <span class="badge">${escapeHtml(game.kindLabel)}</span>
          <span class="badge ${game.playable ? 'is-playable' : 'is-missing'}">${escapeHtml(game.statusLabel)}</span>
        </div>
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.baseTitle === game.title ? game.notes : `原型：${game.baseTitle}`)}</p>
        <a class="card-link" href="#/game/${encodeURIComponent(game.id)}">查看详情</a>
      </div>
    </article>
  `).join('');
}

function renderDetail(id) {
  const game = gameById(id);
  if (!game) {
    view().innerHTML = '<div class="empty-state">没有找到这个游戏。<a href="#/games">返回列表</a></div>';
    return;
  }

  view().innerHTML = `
    <section class="page-heading">
      <p class="eyebrow"><a href="#/games">小游戏列表</a> / ${escapeHtml(game.kindLabel)}</p>
      <h1>${escapeHtml(game.title)}<br><span>${escapeHtml(game.statusLabel)}</span></h1>
      <p>${escapeHtml(game.notes)}</p>
    </section>
    <section class="detail-layout">
      <aside class="detail-card detail-cover">
        <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}">
        <div class="detail-meta">
          <div class="meta-chip"><span>分类</span><strong>${escapeHtml(game.kindLabel)}</strong></div>
          <div class="meta-chip"><span>原型</span><strong>${escapeHtml(game.baseTitle)}</strong></div>
          <div class="meta-chip"><span>状态</span><strong>${escapeHtml(game.statusLabel)}</strong></div>
          ${game.sizeBytes ? `<div class="meta-chip"><span>大小</span><strong>${formatBytes(game.sizeBytes)}</strong></div>` : ''}
        </div>
      </aside>
      <article class="detail-card">
        <h2>资源对齐</h2>
        <p>运行页使用本仓库随站部署的 SWF；全部 32 个游戏都已归档并接入 Ruffle，经典游戏同时保留原 CDN URL 作为溯源记录。</p>
        <div class="detail-actions">
          ${game.playable ? `<a class="primary-button" href="#/play/${encodeURIComponent(game.id)}">启动 Ruffle</a>` : '<span class="primary-button is-disabled">等待补档</span>'}
          ${game.cdnUrl ? `<a class="ghost-button" href="${escapeHtml(game.cdnUrl)}" target="_blank" rel="noreferrer">原 CDN 链接</a>` : ''}
          <a class="ghost-button" href="${sourceHref(game)}" target="_blank" rel="noreferrer">source 归档</a>
          <a class="ghost-button" href="#/games">返回列表</a>
        </div>
        <div class="notice" style="margin-top: 22px;">
          SWF / Flash 是历史格式。建议优先使用本站内置 Ruffle、虚拟机或沙箱环境运行，不要直接在不可信环境打开未知文件。
        </div>
      </article>
    </section>
  `;
}

function renderPlayer(id) {
  const game = gameById(id);
  if (!game || !game.playable) {
    view().innerHTML = '<div class="empty-state">这个游戏目前没有可运行资源。<a href="#/games">返回列表</a></div>';
    return;
  }

  view().innerHTML = `
    <section class="player-page">
      <div class="page-heading">
        <p class="eyebrow"><a href="#/game/${encodeURIComponent(game.id)}">${escapeHtml(game.title)}</a> / Ruffle Player</p>
        <h1>正在运行<br><span>${escapeHtml(game.title)}</span></h1>
      </div>
      <div class="player-shell">
        <div class="player-frame">
          <div id="ruffle-container" class="ruffle-container">
            <div class="skeleton">正在加载 Ruffle 和 SWF...</div>
          </div>
        </div>
        <aside class="player-side">
          <h2>${escapeHtml(game.title)}</h2>
          <p class="muted">原型：${escapeHtml(game.baseTitle)}</p>
          <p class="muted">资源：${escapeHtml(game.swf)}</p>
          <div class="player-actions">
            <a class="ghost-button" href="#/game/${encodeURIComponent(game.id)}">详情</a>
            <a class="ghost-button" href="${escapeHtml(game.swf)}" download>下载 SWF</a>
            <a class="ghost-button" href="#/games?kind=playable">更多可运行</a>
          </div>
          <div class="notice" style="margin-top: 18px;">如果画面没有自动开始，可点击播放器区域或右键切换全屏。</div>
        </aside>
      </div>
    </section>
  `;

  bootRuffle(game.swf, 'ruffle-container');
}

function renderLab() {
  view().innerHTML = `
    <section class="page-heading">
      <p class="eyebrow">Local Lab</p>
      <h1>SWF<br><span>试跑台</span></h1>
      <p>用于本地校对 source 或 ChatQPet 新产物：拖入一个 SWF，即可用当前 Ruffle 配置试跑。</p>
    </section>
    <section class="lab-panel">
      <div id="drop-zone" class="drop-zone">
        <div>
          <h2>拖拽 SWF 到这里</h2>
          <p class="muted">也可以点击选择文件。文件只在浏览器本地读取，不会上传。</p>
        </div>
      </div>
      <input id="swf-input" type="file" accept=".swf" hidden>
      <div class="lab-actions">
        <a class="ghost-button" href="#/games">返回游戏馆</a>
      </div>
      <div id="lab-player" class="player-frame" style="display:none; margin-top: 22px;">
        <div id="lab-container" class="ruffle-container"></div>
      </div>
    </section>
  `;

  const zone = document.getElementById('drop-zone');
  const input = document.getElementById('swf-input');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('is-dragging');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-dragging'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('is-dragging');
    const file = event.dataTransfer.files[0];
    if (file) runLocalSwf(file);
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) runLocalSwf(file);
  });
}

function configureRuffle() {
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    autoplay: 'on',
    unmuteOverlay: 'hidden',
    letterbox: 'on',
    scale: 'showAll',
    forceScale: true,
    fontSources: [state.data?.fontSource || 'https://qpetlover.cn/qpet-adventure/myfont.swf'],
    defaultFonts: {
      sans: ['站酷快乐体2016修订版'],
    },
  };
}

function loadRuffle() {
  configureRuffle();
  if (window.RufflePlayer && typeof window.RufflePlayer.newest === 'function') {
    return Promise.resolve();
  }
  if (rufflePromise) return rufflePromise;
  rufflePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = state.data?.ruffleSource || 'assets/vendor/ruffle/ruffle.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Ruffle 加载失败'));
    document.head.appendChild(script);
  });
  return rufflePromise;
}

async function bootRuffle(url, containerId) {
  const container = document.getElementById(containerId);
  try {
    await loadRuffle();
    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();
    container.innerHTML = '';
    container.appendChild(player);
    await player.load(url);
  } catch (error) {
    container.innerHTML = `<div class="notice">${escapeHtml(error.message || '加载失败')}。请检查 CDN、Ruffle 或 SWF 路径。</div>`;
  }
}

function runLocalSwf(file) {
  const url = URL.createObjectURL(file);
  document.getElementById('lab-player').style.display = 'block';
  bootRuffle(url, 'lab-container');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

async function init() {
  try {
    const response = await fetch('assets/data/games.json', { cache: 'no-cache' });
    state.data = await response.json();
    state.games = state.data.games;
    SITE.sourceRepo = state.data.sourceRepository || SITE.sourceRepo;
    SITE.adventureRepo = state.data.adventureRepository || SITE.adventureRepo;
    SITE.adventureSite = state.data.adventureSite || SITE.adventureSite;
  } catch (error) {
    view().innerHTML = `<div class="empty-state">游戏数据加载失败：${escapeHtml(error.message)}</div>`;
    return;
  }

  window.addEventListener('hashchange', () => {
    routeTo();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('click', (event) => {
    const match = event.target.closest('[data-title-link]');
    if (!match) return;
    const games = gamesByTitle(match.dataset.titleLink);
    if (games.length === 1) window.location.hash = `#/game/${encodeURIComponent(games[0].id)}`;
  });

  routeTo();
  render();
}

init();
