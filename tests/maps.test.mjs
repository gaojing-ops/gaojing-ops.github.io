import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {getMap,DUNGEON_MAPS} from '../games/keystone/maps.js';
import {DUNGEONS,DEFAULT_TEAM} from '../games/keystone/data.js';
import {Run} from '../games/keystone/engine.js';
const ref=JSON.parse(fs.readFileSync(new URL('../games/keystone/maps/source.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url);
test('homepage is the same Keystone entry and the old tracked game is removed',()=>{
 assert.equal(fs.readFileSync(new URL('index.html',root),'utf8'),fs.readFileSync(new URL('games/keystone/index.html',root),'utf8'));
 assert.ok(!fs.existsSync(new URL('games/emberfall',root))||fs.readdirSync(new URL('games/emberfall',root)).length===0);
 assert.ok(!fs.readFileSync(new URL('index.html',root),'utf8').includes('emberfall'));
});
test('each dungeon has its own retained in-game atlas, route and source commit',()=>{
 const hashes=new Set(),routes=new Set();for(const d of DUNGEONS){const map=getMap(d.id);const asset=fs.readFileSync(new URL('.'+map.image,root));assert.ok(asset.length>20000);hashes.add(createHash('sha256').update(asset).digest('hex'));routes.add(JSON.stringify(map.route));assert.equal(map.sourceCommit,ref.commit);assert.ok(map.route.every(p=>p.x>=0&&p.x<=map.width&&p.y>=0&&p.y<=map.height));assert.ok(map.route.every(p=>p.via.every(v=>v.x>=0&&v.x<=map.width&&v.y>=0&&v.y<=map.height)));}assert.equal(hashes.size,8);assert.equal(routes.size,8);
});
test('actual boss counts, order and retained positions are used by the simulation',()=>{
 const counts={fangs:3,murder:4,nalorakk:3,vale:4,arena:3,kings:4,temple:4,ruby:3};
 for(const [id,n] of Object.entries(counts)){const map=getMap(id),bosses=map.route.filter(n=>n.kind==='boss');assert.equal(map.bosses.length,n);assert.equal(bosses.length,n);for(const [i,b] of bosses.entries()){const source=ref.dungeons[id].bosses.find(s=>s.name===b.bossName);assert.ok(source);assert.ok(Math.hypot(source.x-b.x,source.y-b.y)<.01);assert.equal(b.bossIndex,i);}const r=new Run({team:DEFAULT_TEAM,dungeon:id});assert.equal(r.bossNames.length,n);assert.equal(r.route.length,map.route.length);}
 assert.equal(getMap('vale').bosses[0],'Meittik');assert.equal(getMap('vale').bosses.at(-1),'Ziekket');
});
test('Ruby transport and corridor waypoints are preserved across resume',()=>{
 const r=new Run({team:DEFAULT_TEAM,dungeon:'ruby',seed:8});assert.ok(r.route[4].transport);r.index=4;r.phase='walking';r.update(.04);assert.equal(r.transportedIndex,4);assert.ok(r.log.some(l=>l.text.includes('龙骑')));const saved=r.serialize();const restored=Run.restore(saved);assert.equal(restored.pathCursor,r.pathCursor);assert.equal(restored.transportedIndex,4);assert.throws(()=>Run.restore({...saved,version:1}));
});
