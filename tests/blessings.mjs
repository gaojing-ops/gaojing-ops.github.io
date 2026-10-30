import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Expose closure state only in this in-memory harness; production has no debug API.
let source=fs.readFileSync(new URL('../games/emberfall/game.js',import.meta.url),'utf8')
  .replaceAll('export ','')
  .replace('return {start,pause,resume,restart:',`return {test:{player:()=>p,enemies:()=>enemies,shots:()=>shots,update,render,hurtEnemy,autoAttack,
    levelUp(){xp=xpNext;checkLevel();return choices;},
    offer(id){state='upgrade';choices=[UPGRADES.find(u=>u.id===id)];},
    maxBuild(){for(const u of UPGRADES)build[u.id]=u.max;}},start,pause,resume,restart:`);
const labels=[];
const context=new Proxy({}, {get(target,key){return target[key]??(key==='createRadialGradient'?()=>({addColorStop(){}}):key==='fillText'?(text)=>labels.push(text):()=>{});},set(target,key,value){target[key]=value;return true;}});
const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:1020,height:600})};
let frame;
const sandbox={console,Math,Set,document:{createElement:()=>canvas},window:{devicePixelRatio:1,addEventListener(){},removeEventListener(){}},requestAnimationFrame(fn){frame=fn;return 1;},cancelAnimationFrame(){}};
vm.createContext(sandbox);
vm.runInContext(source+';globalThis.createGame=createGame;globalThis.DEITIES=DEITIES;globalThis.UPGRADES=UPGRADES;',sandbox);
assert.equal(Object.keys(sandbox.DEITIES).length,5);
assert.equal(sandbox.UPGRADES.length,21);
assert.ok(sandbox.UPGRADES.every(u=>u.deity&&u.color));
const game=sandbox.createGame(canvas);
const p=()=>game.test.player();
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const pick=id=>{game.test.offer(id);assert.equal(game.chooseUpgrade(id),true);};
game.start();
assert.equal(game.dash(),true);
assert.equal(game.dash(),false);
near(game.getSnapshot().dashCooldown,3);
game.test.render();assert.ok(labels.includes('闪避 3.0s'));
frame(100);game.pause();frame(1100);near(p().dashCooldown,3);
game.resume();game.test.update(.5);near(p().dashCooldown,2.5);
pick('gale');near(p().speed,215*1.08);near(p().dashMax,2.55);
pick('dash');near(p().dashMax,2.04);near(p().dashCooldown,2.04);
game.test.update(2.04);near(p().dashCooldown,0);game.test.render();assert.ok(labels.includes('闪避就绪'));
assert.equal(game.dash(),true);

game.start();pick('sun');near(p().damage,21*1.18);
const enemy=game.test.enemies()[0];enemy.hp=enemy.maxHp=1000;enemy.damage=0;
game.test.hurtEnemy(enemy,10);assert.equal(enemy.burn,2.6);
const beforeBurn=enemy.hp;game.test.update(.01);near(beforeBurn-enemy.hp,2);
pick('fire');enemy.burnTick=0;
const beforeCombined=enemy.hp;game.test.update(.01);near(beforeCombined-enemy.hp,10);
pick('frostbite');game.test.hurtEnemy(enemy,1);near(enemy.slow,.6);near(p().armor,1);
pick('frostbite');game.test.hurtEnemy(enemy,1);near(enemy.slow,1.2);near(p().armor,2);
pick('storm');near(p().crit,.15);near(p().critMultiplier,2.25);
p().crit=1;game.test.autoAttack();near(game.test.shots().at(-1).damage,p().damage*2.25);
p().hp=40;pick('verdure');near(p().hp,60);near(p().maxHp,120);near(p().regen,.5);
const blessing=game.getSnapshot().build.find(u=>u.id==='verdure');assert.equal(blessing.deity,'森神 · 青萝');
for(let i=0;i<100;i++){game.start();const options=game.test.levelUp();assert.equal(options.length,3);assert.equal(new Set(options.map(u=>u.deityId)).size,3);assert.equal(game.chooseUpgrade('invalid'),false);}
game.start();game.test.maxBuild();assert.equal(game.test.levelUp()[0].id,'heal');assert.equal(game.chooseUpgrade('heal'),true);
game.restart();near(p().critMultiplier,2);near(p().chillDuration,0);near(p().dashMax,3);near(p().regen,0);assert.equal(game.getSnapshot().build.length,0);
game.destroy();
console.log('PASS: five patrons, 21 blessings, burn/slow/crit/heal effects, mixed cooldown stacking, pause, HUD states, diverse offers, exhausted pool and restart.');
