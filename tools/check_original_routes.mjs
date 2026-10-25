import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

// Production routing with browser seams, without running the Ruffle engine.
const catalog = JSON.parse(readFileSync(new URL('../assets/data/games.json', import.meta.url)));
const app = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const nativeSite = 'https://qpetlover.cn/QPetGamesWeb/';
const nativeGames = {
  'classic-001': 'qpet-guardian', 'classic-002': 'magpie-bridge', 'classic-003': 'qpet-racing',
  'classic-014': 'qpet-match', 'classic-015': 'qpet-stars', 'happy-forest': 'qpet-forest',
  'happy-qqtang': 'qpet-qqtang', 'happy-dungeon': 'qpet-dungeon',
};
const retiredIds = Array.from({length: 13}, (_, index) => index + 1).flatMap((group) =>
  ([3, 5, 6].includes(group) ? [1, 2] : [1]).map((variant) => `reskin-${String(group).padStart(3, '0')}-${String(variant).padStart(2, '0')}`));
const cachedCatalog = {...catalog, games: [...catalog.games, ...retiredIds.map((id) => ({id, kind: 'reskin', title: id, playable: true, swf: `reskin_games/${id}.swf`}))]};
const flush = () => new Promise(setImmediate);
function harness(hash) {
  const nodes = new Map(), loads = [], replacements = [], fetches = [];
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {innerHTML: '', value: '', style: {}, addEventListener() {}, appendChild() {}});
    return nodes.get(id);
  };
  const window = {
    location: {hash, replace(value) {replacements.push(value);}}, addEventListener() {}, scrollTo() {},
    RufflePlayer: {newest: () => ({createPlayer: () => ({ruffle: () => ({}), async load(value) {loads.push(value);}})})},
  };
  const context = vm.createContext({
    window, document: {getElementById: node, querySelectorAll: () => [], addEventListener() {}},
    fetch: async (url) => {fetches.push(url); return {async json() {return cachedCatalog;}};}, URLSearchParams,
  });
  vm.runInContext(app, context, {timeout: 1000});
  return {context,window,node,loads,replacements,fetches,run(code) {return vm.runInContext(code,context,{timeout:1000});}};
}
for (const hash of ['', '#', '#/', '#/home']) {
  const home = harness(hash);await flush();
  assert.deepEqual(home.replacements,[nativeSite],`legacy home ${hash} must replace with the native hall`);
  assert.equal(home.fetches.length,0,'default entry must redirect before catalog or player loading');
  assert.equal(home.loads.length,0,'default entry must never start an original game');
}
const h=harness('#/games');await flush();
assert.equal(h.run('state.games.length'),19,'cached catalog must exclude all reskins');
assert.equal(h.run('SITE.adventureSite'),nativeSite+'qpet-adventure/','legacy catalog metadata cannot override native Adventure navigation');
assert.equal((h.node('catalog-grid').innerHTML.match(/class="catalog-card"/g)||[]).length,19);
assert(!h.node('view').innerHTML.includes('data-filter="reskin"'));
assert(!h.node('view').innerHTML.includes('data-filter="archive"'));
function card(id) {
  return h.node('catalog-grid').innerHTML.match(new RegExp('<article class="catalog-card" data-game="'+id+'">([\\s\\S]*?)</article>'))?.[1];
}
for (const game of catalog.games) {
  const html=card(game.id),native=nativeGames[game.id];assert(html,game.id+' card exists');
  const main=native?nativeSite+native+'/':'#/game/'+game.id;
  assert.equal((html.match(new RegExp('href="'+main.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"','g'))||[]).length,3,game.id+' image/title/main action must use the default destination');
  assert(html.includes('href="#/play/'+game.id+'">原版对照</a>'),game.id+' retains a separate explicit Ruffle button');
  assert(html.includes('>'+ (native?'已复刻':'原版')+'</span>'),game.id+' has the simple mode label');
  assert(!html.includes(game.notes),game.id+' card must not expose development notes');
  assert(!html.includes('Ruffle'),game.id+' card labels stay simple');
  h.window.location.hash='#/game/'+game.id;h.run('routeTo();render();');
  const detail=h.node('view').innerHTML;
  assert(!detail.includes(game.notes),game.id+' detail must not expose development notes');
  assert(!detail.includes('Ruffle'),game.id+' detail labels stay simple');
  assert(!/资源对齐|运行页使用|source 归档|原 CDN|下载 SWF|meta-chip/.test(detail));
  assert(detail.includes('href="#/play/'+game.id+'">原版对照</a>'));
  if(native)assert(detail.includes('href="'+main+'">开始游戏</a>'));
  else assert(!detail.includes(nativeSite),'unported games cannot invent a native game link');
}
for (const [filter,count] of [['native',8],['ruffle',11]]) {
  h.run(`state.filter=${JSON.stringify(filter)};paintCatalogGrid();`);
  assert.equal((h.node('catalog-grid').innerHTML.match(/class="catalog-card"/g)||[]).length,count);
}
h.window.location.hash='#/originals';h.run('routeTo();render();');
assert.equal((h.node('catalog-grid').innerHTML.match(/class="catalog-card"/g)||[]).length,19,'explicit originals alias retains the same directory');
for (const game of catalog.games) {
  h.window.location.hash = `#/play/${game.id}`;h.run('routeTo(); render();');await flush();
  const html=h.node('view').innerHTML;
  assert(html.includes('id="ruffle-container"'),game.id+' keeps its original player route');
  assert(html.includes('>原版对照</a>'),game.id+' player mode is explicit');
  assert(!html.includes('Ruffle'),game.id+' player labels stay simple');
  assert(!html.includes(game.notes)&&!html.includes(game.swf),game.id+' player shows gameplay controls instead of source metadata');
  const expected=game.parameters?{url:game.swf,parameters:game.parameters}:game.swf;
  assert.deepEqual(JSON.parse(JSON.stringify(h.loads.at(-1))),expected,game.id+' preserves exact file and host parameters');
}
const retainedLoads=h.loads.length;
for (const id of [...retiredIds,'classic-999','happy-unknown']) {
  for (const route of ['play','game']) {
    h.window.location.hash=`#/${route}/${id}`;h.run('routeTo(); render();');await flush();
    assert(!h.node('view').innerHTML.includes('id="ruffle-container"'),id+' must not create a player');
    assert(!h.node('view').innerHTML.includes('class="primary-button"'),id+' must not expose a launch action');
  }
}
assert.equal(h.loads.length,retainedLoads,'retired and unknown routes must not load a SWF');
h.window.location.hash='#/lab';h.run('routeTo();render();');assert(h.node('view').innerHTML.includes('id="swf-input"'),'old lab deep link stays available');
const header=index.match(/<header[\s\S]*?<\/header>/)[0];
assert(!index.includes('Ruffle'),'visible page title and navigation use original comparison');
assert(!header.includes('#/lab'),'laboratory is absent from primary navigation');
assert(header.includes('href="'+nativeSite+'qpet-adventure/"'),'Adventure navigation enters the native game');
assert(!header.includes('href="https://qpetlover.cn/qpet-adventure/"'),'old original Adventure cannot be the primary destination');
assert(/class="brand" href="https:\/\/qpetlover.cn\/QPetGamesWeb\/"/.test(header));
for(const file of ['assets/js/app.js','assets/css/site.css']){
  const hash=createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex').slice(0,16);
  assert(index.includes(file+'?v='+hash),file+' cache version must match this UI release');
}
console.log(JSON.stringify({passed:true,nativeHomeRedirects:4,nativeCardRoutes:8,originalOnlyCards:11,originalPlayerRoutes:19,retiredIds:retiredIds.length,deniedDetailAndPlayerRoutes:36,cachedCatalogOriginalsOnly:true,visibleDevelopmentNotes:false,visibleRuffleBranding:false,nativeAdventureNavigation:true,gameplayRun:false}));
