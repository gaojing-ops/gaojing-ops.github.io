import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the real engine deterministically without waiting for a three-minute run.
// This test-only adapter exposes closure state; the shipped module stays private.
const source = readFileSync(new URL('../games/emberfall/game.js', import.meta.url), 'utf8');
function engine() {
  const listeners = new Map(), results = [];
  const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient'
    ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  const canvas = { getContext: () => context, getBoundingClientRect: () => ({width:1000,height:600}) };
  const sandbox = { console, Math, Set, document: {createElement: () => canvas},
    window: {addEventListener: (key, fn) => listeners.set(key,fn), removeEventListener() {}},
    requestAnimationFrame: () => 1, cancelAnimationFrame() {} };
  vm.createContext(sandbox);
  const instrumented = source.replace('export function createGame', 'function createGame')
    .replace('return {start,pause,resume,restart:', `return {test:{
      update, checkLevel, hurtEnemy, castLightning,
      player:()=>p, keys:()=>keys, choices:()=>choices,
      set:(data)=>{if(data.enemies)enemies=data.enemies;if(data.shots)shots=data.shots;
        if(data.hostile)hostile=data.hostile;if(data.gems)gems=data.gems;
        if(data.warnings)warnings=data.warnings;if(data.build)build=data.build;
        if(data.xp!==undefined)xp=data.xp;},
      maxBuild:()=>Object.fromEntries(UPGRADES.map(u=>[u.id,u.max]))
    },start,pause,resume,restart:`);
  vm.runInContext(instrumented, sandbox);
  const game = sandbox.createGame(canvas, {onEnd:r=>results.push(r)});
  game.start();
  return {game, t:game.test, results, key:(extra={})=>{
    const event = {key:' ',preventDefault(){this.defaultPrevented=true;},...extra};
    listeners.get('keydown')(event); return event;
  }, listeners};
}
function enemy(type, x, y) {
  return {id:type==='boss'?1:2,type,x,y,hp:1,maxHp:1,r:20,speed:0,damage:1,
    xp:1,hit:0,slow:0,orbCd:0,phase:0,burn:0,attack:100};
}

test('Space activates a focused button without consuming dash; canvas Space still dashes',()=>{
  const {game,key}=engine();
  const event=key({target:{closest:selector=>selector.includes('button')?{}:null}});
  assert.equal(event.defaultPrevented,undefined);
  assert.equal(game.getSnapshot().dashCooldown,0);
  assert.equal(key().defaultPrevented,true);
  assert.equal(game.getSnapshot().dashCooldown,3);
});
test('browser shortcuts, IME input and already-handled keys do not move or dash',()=>{
  const {game,key,t}=engine();
  for(const flag of ['ctrlKey','metaKey','altKey','isComposing','defaultPrevented']) {
    key({key:'w',[flag]:true}); key({[flag]:true});
  }
  assert.equal(t.keys().size,0);
  assert.equal(game.getSnapshot().dashCooldown,0);
});
test('pause and focus loss clear both movement sources and freeze simulation',()=>{
  const {game,key,t,listeners}=engine();
  key({key:'w'});game.setMovement(1,0);listeners.get('blur')();
  assert.equal(game.getSnapshot().state,'paused');assert.equal(t.keys().size,0);
  game.resume();const p=t.player(),x=p.x,y=p.y;t.update(.01);
  assert.equal(p.x,x);assert.equal(p.y,y);
});
test('a maxed build still offers a usable upgrade at full health',()=>{
  const {game,t}=engine();t.set({build:t.maxBuild(),xp:6});t.checkLevel();
  assert.equal(game.getSnapshot().state,'upgrade');
  assert.ok(t.choices().length>0);assert.equal(game.chooseUpgrade(t.choices()[0].id),true);
  assert.equal(game.getSnapshot().state,'playing');
});
test('chain lightning stops adding kills after the winning hit',()=>{
  const {game,t,results}=engine();const p=t.player();
  t.set({build:{lightning:3},enemies:[enemy('boss',p.x+20,p.y),enemy('shade',p.x+40,p.y)]});
  t.castLightning();
  assert.equal(game.getSnapshot().state,'won');
  assert.equal(results.length,1);assert.equal(results[0].kills,1);
  assert.equal(game.getSnapshot().kills,results[0].kills);
});
test('a piercing winning shot cannot change the recorded result or collect healing',()=>{
  const {game,t,results}=engine();const p=t.player();p.hp=40;
  t.set({enemies:[enemy('boss',p.x+100,p.y),enemy('shade',p.x+100,p.y)],
    shots:[{x:p.x+100,y:p.y,vx:0,vy:0,r:30,life:1,hit:new Set(),damage:10,pierce:2}],
    gems:[{x:p.x,y:p.y,heal:true}]});
  t.update(.001);
  assert.equal(game.getSnapshot().state,'won');assert.equal(results[0].kills,1);
  assert.equal(game.getSnapshot().kills,1);assert.equal(p.hp,40);
});
for(const damageSource of ['hostile','warnings']) test(`fatal ${damageSource} damage cannot be healed later in the same frame`,()=>{
  const {game,t,results}=engine();const p=t.player();p.hp=1;
  const damage={x:p.x,y:p.y,vx:0,vy:0,r:20,life:damageSource==='warnings'?0:1,damage:100};
  t.set({enemies:[],[damageSource]:[damage],gems:[{x:p.x,y:p.y,heal:true}]});t.update(.001);
  assert.equal(game.getSnapshot().state,'lost');assert.equal(results.length,1);assert.equal(p.hp,0);
});
