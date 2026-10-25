import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const home='https://qpetlover.cn/QPetGamesWeb/';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
let count=0;
for(const hash of ['', '#', '#/', '#/home', '#/unknown', '#/games', '#/originals', '#/game/classic-001', '#/play/classic-001', '#/play/happy-dungeon', '#/lab']){
 const calls=[], location={hash,replace(value){calls.push(value)}};
 vm.runInNewContext(script,{location});
 const expected=/^#\/(?:play|game|games|originals|lab)(?:[/?]|$)/.test(hash)?home+'originals/'+hash:home;
 assert.deepEqual(calls,[expected]);count++;
}
for(const file of ['classical_games/index.html','classical_games/pages.html','onegame.html']){
 const text=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 assert(text.includes('https://qpetlover.cn/QPetGamesWeb/'),file);
 assert(!text.includes('<canvas')&&!text.includes('fetch('),file);
}
console.log(JSON.stringify({passed:true,redirectRoutes:count,legacyPages:3,secondGameSite:false}));
