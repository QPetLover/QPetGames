const SITE = {
  title: 'Q宠游戏 · 原版对照',
  nativeSite: 'https://qpetlover.cn/QPetGamesWeb/',
  adventureSite: 'https://qpetlover.cn/QPetGamesWeb/qpet-adventure/',
};
const NATIVE_GAMES = Object.freeze({
  'classic-001': 'qpet-guardian',
  'classic-002': 'magpie-bridge',
  'classic-003': 'qpet-racing',
  'classic-014': 'qpet-match',
  'classic-015': 'qpet-stars',
  'happy-forest': 'qpet-forest',
  'happy-qqtang': 'qpet-qqtang',
  'happy-dungeon': 'qpet-dungeon',
});
const CONTROLS = Object.freeze({
  'classic-001': '在 QGG 所在区域调整角度，点按投出雪球。',
  'classic-002': '移动鼠标或拖动手指抓住喜鹊，避开乌鸦。',
  'classic-003': '方向键控制驾驶，Ctrl 使用道具。',
  'classic-014': '点击管道改变方向，连接两侧带着爱心的 Q宠。',
  'classic-015': '← → 移动 QGG 托住 QMM；↑ ↓ 微调弹跳角度。',
  'happy-forest': '种下种子，沿着长成的植物探索森林。',
  'happy-qqtang': '单人方向键移动、空格放弹；双人 P1 使用 WASD/空格，P2 使用方向键/回车。',
  'happy-dungeon': '方向键移动，X 攻击、C 跳跃、Z 技能、回车对话。',
});
function nativeHref(game) {
  const slug = NATIVE_GAMES[game.id];
  return slug ? SITE.nativeSite + slug + '/' : null;
}
function gameLabel(game) { return nativeHref(game) ? '已复刻' : '原版'; }
function primaryHref(game) { return nativeHref(game) || '#/game/' + encodeURIComponent(game.id); }
function goToNativeHome() {
  view().innerHTML = '<p>正在前往<a href="' + SITE.nativeSite + '">游戏大厅</a>…</p>';
  window.location.replace(SITE.nativeSite);
}

// This independent Ruffle baseline publishes original QQ Pet games only.
// Keep retired catalog entries out even if an old catalog is cached.
function isOriginalGame(game) {
  return (game.kind === 'classic' && /^classic-0(0[1-9]|1[0-6])$/.test(game.id)) ||
    (game.kind === 'archive' && ['happy-forest', 'happy-qqtang', 'happy-dungeon'].includes(game.id));
}

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

function setActiveNav() {
  document.querySelectorAll('[data-nav]').forEach((node) => {
    node.classList.toggle('is-active', node.dataset.nav === 'games' && ['games', 'originals', 'game', 'play'].includes(state.route));
  });
}

function render() {
  if (state.route === 'home') return goToNativeHome();
  if (!state.data) {
    view().innerHTML = '<div class="skeleton">正在加载游戏…</div>';
    return;
  }
  setActiveNav();
  if (state.route === 'games' || state.route === 'originals') return renderCatalog();
  if (state.route === 'game') return renderDetail(state.params.id);
  if (state.route === 'play') return renderPlayer(state.params.id);
  if (state.route === 'lab') return renderLab();
  return goToNativeHome();
}

function renderCatalog() {
  state.filter = state.params.kind || 'all';
  state.query = state.params.search || '';

  view().innerHTML = `
    <section class="page-heading">
      <p class="eyebrow">原版对照</p>
      <h1>小游戏</h1>
    </section>
    <section class="catalog-tools">
      <input id="game-search" class="search-input" type="search" value="${escapeHtml(state.query)}" placeholder="搜索游戏">
      <div class="filter-pills" role="tablist" aria-label="游戏筛选">
        ${filterButton('all', '全部')}
        ${filterButton('native', '已复刻')}
        ${filterButton('ruffle', '原版')}
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
      (state.filter === 'native' && !!nativeHref(game)) ||
      (state.filter === 'ruffle' && !nativeHref(game)) ||
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

  grid.innerHTML = games.map((game) => `
    <article class="catalog-card" data-game="${escapeHtml(game.id)}">
      <a class="card-cover" href="${escapeHtml(primaryHref(game))}" aria-label="${escapeHtml(game.title)}"><img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}"></a>
      <div class="card-body">
        <div class="card-meta"><span class="badge ${nativeHref(game) ? 'is-playable' : ''}">${gameLabel(game)}</span></div>
        <h3><a href="${escapeHtml(primaryHref(game))}">${escapeHtml(game.title)}</a></h3>
        <div class="card-actions">
          <a class="card-link" href="${escapeHtml(primaryHref(game))}">${nativeHref(game) ? '开始游戏' : '查看详情'}</a>
          <a class="card-ruffle" href="#/play/${encodeURIComponent(game.id)}">原版对照</a>
        </div>
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
  const native = nativeHref(game), controls = CONTROLS[game.id];
  view().innerHTML = `
    <section class="page-heading">
      <p class="eyebrow"><a href="#/games">原版对照</a></p>
      <h1>${escapeHtml(game.title)}</h1>
      <span class="badge ${native ? 'is-playable' : ''}">${gameLabel(game)}</span>
    </section>
    <section class="detail-layout">
      <div class="detail-card detail-cover"><img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)}"></div>
      <article class="detail-card">
        ${controls ? `<h2>怎么玩</h2><p>${escapeHtml(controls)}</p>` : ''}
        <div class="detail-actions">
          ${native ? `<a class="primary-button" href="${escapeHtml(native)}">开始游戏</a>` : ''}
          <a class="ghost-button" href="#/play/${encodeURIComponent(game.id)}">原版对照</a>
          <a class="ghost-button" href="#/games">返回列表</a>
        </div>
      </article>
    </section>
  `;
}

function renderPlayer(id) {
  const game = gameById(id);
  if (!game || !game.playable) {
    view().innerHTML = '<div class="empty-state">没有找到这个游戏。<a href="#/games">返回列表</a></div>';
    return;
  }
  const archive = game.kind === 'archive', native = nativeHref(game), controls = CONTROLS[game.id];
  view().innerHTML = `
    <section class="player-page${archive ? ' player-page-archive' : ''}">
      <div class="page-heading">
        <p class="eyebrow"><a href="#/games">原版对照</a></p>
        <h1>${escapeHtml(game.title)}</h1>
      </div>
      <div class="player-shell">
        <div class="player-frame"><div id="ruffle-container" class="ruffle-container"><div class="skeleton">正在加载游戏…</div></div></div>
        <aside class="player-side">
          ${controls ? `<h2>怎么玩</h2><p>${escapeHtml(controls)}</p>` : ''}
          <div class="player-actions">
            ${native ? `<a class="primary-button" href="${escapeHtml(native)}">玩复刻版</a>` : ''}
            <a class="ghost-button" href="#/games">返回列表</a>
          </div>
        </aside>
      </div>
    </section>
  `;
  bootRuffle(game.swf, 'ruffle-container', game);
}

function renderLab() {
  view().innerHTML = `
    <section class="page-heading">
      <p class="eyebrow">原版对照</p>
      <h1>SWF<br><span>试跑台</span></h1>
      <p>拖入一个 SWF 文件开始游戏。</p>
    </section>
    <section class="lab-panel">
      <div id="drop-zone" class="drop-zone">
        <div>
          <h2>拖拽 SWF 到这里</h2>
          <p class="muted">也可以点击选择文件。文件只在本机打开。</p>
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
    fontSources: [state.data?.fontSource || 'assets/fonts/original-comparison.swf'],
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

async function bootRuffle(url, containerId, game) {
  const container = document.getElementById(containerId);
  try {
    await loadRuffle();
    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();
    // These fixed comparison files use their own embedded/device fonts, as in
    // the isolated baseline. The adventure font is unrelated to their source.
    if (game?.kind === 'archive') {
      player.ruffle().config = {fontSources: [], defaultFonts: {}};
    }
    container.innerHTML = '';
    container.appendChild(player);
    await player.load(game?.parameters ? {url, parameters: game.parameters} : url);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="notice">加载失败，请刷新重试。</div>';
  }
}

function runLocalSwf(file) {
  const url = URL.createObjectURL(file);
  document.getElementById('lab-player').style.display = 'block';
  bootRuffle(url, 'lab-container');
}

async function init() {
  routeTo();
  if (state.route === 'home') return goToNativeHome();
  try {
    const response = await fetch('assets/data/games.json', { cache: 'no-cache' });
    state.data = await response.json();
    state.games = state.data.games.filter(isOriginalGame);
  } catch (error) {
    console.error(error);
    view().innerHTML = '<div class="empty-state">加载失败，请刷新重试。</div>';
    return;
  }

  window.addEventListener('hashchange', () => {
    routeTo();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });


  routeTo();
  render();
}

init();
