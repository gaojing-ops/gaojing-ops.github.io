import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}},ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>ctx});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game'),Boss=require('./src/Boss'),Bullet=require('./src/Bullet');
const {Weapon,WEAPON_DEFS}=require('./src/Weapons');
const {EVOLUTION_RECIPES,UNION_RECIPES,checkEvolutions,evolveWeapon,isEvolutionUnlocked,getEvolutionProgress,getEvolutionDamageMult}=require('./src/Evolution');
const {progression}=require('./src/Progression'),Art=require('./src/Art');
function start(hero='tracer'){const g=new Game(canvas());g.resize(1000,620);g.startWithCharacter(hero,[]);g._tutorialStep=-1;return g;}
function full(g,id){const w=new Weapon(g,id);w.level=w.def.maxLevel;g.player.weapons.push(w);return w;}
function unlocked(g){g.player.kills=5000;g.player.totalHealed=1000;g.player.totalGemsCollected=1000;g.bossKills=10;g.frozenKills=g.poisonKills=100;}

test('all six fusions remain available after ordinary awakening and consume exactly one full secondary',()=>{
 for(const [id,recipe]of Object.entries(UNION_RECIPES)){
  const g=start(),p=g.player;p.weapons=[];unlocked(g);const w=full(g,id),sub=full(g,recipe.requireWeapon),normal=EVOLUTION_RECIPES[id];
  p.passives.push({id:normal.requirePassive,level:1});assert.ok(evolveWeapon(w,normal));assert.ok(w._evolutionBonuses);
  assert.ok(checkEvolutions(p).some(r=>r.isUnion&&r.weaponId===id));
  assert.equal(progression(g).routes.find(r=>r.isUnion&&r.id===id).ready,true);
  assert.equal(evolveWeapon(w,recipe,sub.id),true);assert.equal(p.weapons.length,1);assert.equal(w.id,recipe.resultId);
  assert.equal(getEvolutionDamageMult(w),1);assert.equal(w.damage,Math.floor(WEAPON_DEFS[w.id].baseDamage*1.33*p.might));
  assert.equal(evolveWeapon(w,recipe,sub.id),false);assert.equal(progression(g).routes.find(r=>r.isUnion&&r.id===id).complete,true);
 }
});

test('a locked fusion does not hide normal awakening, and stale or incomplete recipes cannot consume gear',()=>{
 const g=start(),p=g.player;p.weapons=[];const w=full(g,'plasma_arc'),sub=full(g,'pulse_ring');p.passives=[{id:'energy_amp',level:1}];p.kills=500;
 const candidates=checkEvolutions(p);assert.ok(candidates.some(r=>r.isUnion));assert.ok(candidates.some(r=>!r.isUnion));
 assert.equal(isEvolutionUnlocked('plasma_arc',true,p,g),false);assert.ok(evolveWeapon(w,EVOLUTION_RECIPES.plasma_arc));
 unlocked(g);sub.level=1;assert.equal(evolveWeapon(w,UNION_RECIPES.plasma_arc,sub.id),false);assert.equal(w.id,'plasma_arc');assert.equal(p.weapons.length,2);
 sub.level=6;p.weapons.pop();assert.equal(evolveWeapon(w,UNION_RECIPES.plasma_arc,sub.id),false);
});

test('boss conditions count actual deaths once and reset on a new run',()=>{
 const g=start();g.bossWave=10;assert.equal(isEvolutionUnlocked('radiation_field',false,g.player,g),false);assert.equal(getEvolutionProgress('radiation_field',false,g.player,g).current,0);
 for(let i=0;i<2;i++){const b=new Boss(g,1);b.takeDamage(b.hp+100);b._onDeath();assert.equal(g.bossKills,i+1);}
 assert.equal(isEvolutionUnlocked('radiation_field',false,g.player,g),true);g.startWithCharacter('tracer',[]);assert.equal(g.bossKills,0);
});

test('a new watcher does not inherit the mage reaction multiplier or spent awakening cores',()=>{
 const g=start('arcane');g.player.evolutionCores.plasma_arc=true;assert.equal(g.player.synergyBonus,.5);
 g.startWithCharacter('tracer',[]);assert.equal(g.player.synergyBonus||0,0);assert.deepEqual(g.player.evolutionCores,{});
 const {ACHIEVEMENT_DEFS}=require('./src/AchievementSystem');g.bossWave=10;
 assert.equal(ACHIEVEMENT_DEFS.find(a=>a.id==='boss_3').check(g),false);g.bossKills=3;assert.equal(ACHIEVEMENT_DEFS.find(a=>a.id==='boss_3').check(g),true);
});

test('fusion and equipment changes remove lost elemental bonuses while retaining the plague passive',()=>{
 const g=start(),p=g.player;p.weapons=[];for(const id of ['toxin_spray','acid_pool','venom_sting'])full(g,id);
 g.synergy.check();assert.equal(p.plagueSpread,true);assert.equal(p.bonusToxicDmg,.25);
 p.weapons.length=1;for(let i=0;i<5;i++)g.synergy.check();assert.equal(p.plagueSpread,false);assert.equal(p.bonusToxicDmg,0);
 p.passives.push({id:'plague_spread',level:1});g.synergy.check();assert.equal(p.plagueSpread,true);
});

test('all seven reactions apply the mage bonus to actual HP loss or burn damage exactly once',()=>{
 for(const method of ['_triggerEvaporation','_triggerShatter','_triggerToxicBurn','_triggerVoidPoison','_triggerVoidFreeze','_triggerPoisonChain','_triggerCryoPoison']){
  const results=[];
  for(const bonus of [0,.5]){
   const g=start(),p=g.player;p.synergyBonus=bonus;p.luckyChance=0;
   g.enemies=Array.from({length:5},(_,i)=>{const e=g._createEnemy(p.x+i*20,p.y,'Skeleton');e.hp=e.maxHp=100000;e.poisoned=3;e.poisonStacks=5;e.frozen=2;return e;});
   g.synergy[method](g.enemies[0],100);
   results.push(g.enemies.reduce((n,e)=>n+100000-e.hp,0)+(method==='_triggerToxicBurn'?g.enemies[0].burnDamage*3:0));
  }
  assert.ok(results[0]>0,method);assert.ok(Math.abs(results[1]-results[0]*1.5)<1e-8,method);
 }
 const g=start(),e=g._createEnemy(0,0,'Skeleton');e.hp=1e8;e.frozen=1;
 for(let i=0;i<200;i++)g.synergy._triggerVoidFreeze(e,1);assert.equal(e.frozen,3.6);
 e.frozen=8;g.synergy._triggerVoidFreeze(e,1);assert.equal(e.frozen,8);
});

test('freeze stops enemy movement and attacks while poison and burn still tick and count damage',()=>{
 const g=start(),e=g._createEnemy(g.player.x+20,g.player.y,'Skeleton');g.enemies=[e];e.hp=e.maxHp=1000;e.frozen=2;e.poisoned=2;e.poisonStacks=5;e.poisonTickTimer=.1;e.burning=2;e.burnDamage=10;e.burnTickTimer=.1;
 const x=e.x,y=e.y,before=g.player.totalDamage;e.update(.2);
 assert.equal(e.x,x);assert.equal(e.y,y);assert.equal(e.hp,985);assert.equal(e.poisoned,1.8);assert.equal(e.burning,1.8);
 assert.equal(g.player.totalDamage-before,15);assert.equal(g._weaponDamageStats.burn,5);
});

test('fusion presentation objects cannot hit, apply statuses or start expensive synergy scans, and pooling clears the flag',()=>{
 const g=start(),p=g.player;p.weapons=[];
 for(const id of ['fusion_orbital_cannon','fusion_absolute_zero']){const w=new Weapon(g,id);p.weapons=[w];w.fire();}
 assert.equal(g.bullets.length,2);assert.ok(g.bullets.every(b=>b.visualOnly));
 let queries=0,reactions=0;g._getNearbyEnemies=()=>{queries++;return [];};g.synergy.processSynergy=()=>reactions++;
 g._checkCollisions(1/60);assert.equal(queries,1,'only the player contact query remains');assert.equal(reactions,0);
 const b=g.bullets[0];b.reset(g,p.x,p.y,1,0,5,{});assert.equal(b.visualOnly,false);
 assert.equal(new Bullet(g,0,0,0,0,0,{visualOnly:true}).visualOnly,true);
});

test('friendly area fills are bounded, offscreen fields are culled, and rendering uses no combat RNG',()=>{
 const g=start(),w=new Weapon(g,'gravity_cannon');g.camera={x:-500,y:-310};g._friendlyAreaFills=0;
 w._gravityZones=Array.from({length:12},()=>({x:0,y:0,radius:100}));w._gravityZones.push({x:10000,y:10000,radius:100});
 let fills=0;const c=new Proxy({save(){},restore(){},fill(){fills++;},globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 g.qualityLevel=0;const random=Math.random;Math.random=()=>{throw Error('draw consumed RNG');};
 try{Art.drawWeaponGround(c,w);Art.drawWeaponAir(c,w);Art.drawProjectile(c,0,0,1500,'#66ffcc','zero_domain',0,true);}finally{Math.random=random;}
 assert.equal(g._friendlyAreaFills,12);assert.equal(fills,5,'three field fills and two casting-seal facets; the domain stays unfilled');
 assert.equal(w._gravityZones.length,13);
});

test('real domain bullet drawing keeps the actual radius without an opaque legacy halo',()=>{
 const g=start(),arcs=[],alphas=[],stack=[];let alpha=1;
 const c=new Proxy({save(){stack.push(alpha);},restore(){alpha=stack.pop();},arc(x,y,r){arcs.push(r);},fill(){alphas.push(alpha);}},{get:(o,k)=>k==='globalAlpha'?alpha:o[k]??(()=>{}),set:(o,k,v)=>{if(k==='globalAlpha')alpha=v;else o[k]=v;return true;}});
 for(const shape of ['orbital_beam','zero_domain']){
  arcs.length=alphas.length=0;new Bullet(g,0,0,0,0,0,{radius:1000,shape,evolved:true,visualOnly:true}).draw(c);
  assert.ok(arcs.includes(1000));assert.ok(!arcs.some(r=>r>1000));assert.ok(alphas.every(a=>a<.6));assert.equal(alpha,1);
 }
});
