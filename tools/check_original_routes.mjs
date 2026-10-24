import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the production SPA routing with browser seams stubbed. This is a
// routing check, not a claim that the Ruffle engine or original gameplay ran.
const catalog = JSON.parse(readFileSync(new URL('../assets/data/games.json', import.meta.url)));
const retiredIds = Array.from({length: 13}, (_, index) => index + 1).flatMap((group) =>
  ([3, 5, 6].includes(group) ? [1, 2] : [1]).map((variant) => `reskin-${String(group).padStart(3, '0')}-${String(variant).padStart(2, '0')}`));
const cachedCatalog = {...catalog, games: [...catalog.games, ...retiredIds.map((id) => ({id, kind: 'reskin', title: id, playable: true, swf: `reskin_games/${id}.swf`}))]};
const nodes = new Map();
const loads = [];
const node = (id) => {
  if (!nodes.has(id)) nodes.set(id, {innerHTML: '', value: '', style: {}, addEventListener() {}, appendChild() {}});
  return nodes.get(id);
};
const window = {
  location: {hash: '#/games'}, addEventListener() {}, scrollTo() {},
  RufflePlayer: {newest: () => ({createPlayer: () => ({ruffle: () => ({}), async load(value) {loads.push(value);}})})},
};
const context = vm.createContext({
  window, document: {getElementById: node, querySelectorAll: () => [], addEventListener() {}},
  fetch: async () => ({async json() {return cachedCatalog;}}), URLSearchParams,
});
vm.runInContext(readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8'), context, {timeout: 1000});
await new Promise(setImmediate);
assert.equal(vm.runInContext('state.games.length', context), 19, 'cached catalog must still exclude all reskins');
assert.ok(!node('view').innerHTML.includes('data-filter="reskin"'), 'reskin filter must be absent');
assert.equal((node('catalog-grid').innerHTML.match(/class="catalog-card"/g) || []).length, 19);

for (const game of catalog.games) {
  window.location.hash = `#/play/${game.id}`;
  vm.runInContext('routeTo(); render();', context, {timeout: 1000});
  await new Promise(setImmediate);
  assert.ok(node('view').innerHTML.includes('id="ruffle-container"'), `${game.id} must retain its player route`);
  const expected = game.parameters ? {url: game.swf, parameters: game.parameters} : game.swf;
  assert.deepEqual(JSON.parse(JSON.stringify(loads.at(-1))), expected, `${game.id} must preserve its file and host parameters`);
}
const retainedLoads = loads.length;
for (const id of [...retiredIds, 'classic-999', 'happy-unknown']) {
  for (const route of ['play', 'game']) {
    window.location.hash = `#/${route}/${id}`;
    vm.runInContext('routeTo(); render();', context, {timeout: 1000});
    await new Promise(setImmediate);
    assert.ok(!node('view').innerHTML.includes('id="ruffle-container"'), `${id} must not create a player`);
    assert.ok(!node('view').innerHTML.includes('启动 Ruffle'), `${id} must not expose a launch action`);
  }
}
assert.equal(loads.length, retainedLoads, 'retired and unknown routes must never load a SWF');
console.log(JSON.stringify({passed: true, originalPlayerRoutes: 19, retiredIds: retiredIds.length, deniedDetailAndPlayerRoutes: 36, cachedCatalogOriginalsOnly: true, gameplayRun: false}));
