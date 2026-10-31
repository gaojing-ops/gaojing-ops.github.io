import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const storage=new Map();
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:390,height:844,getContext:()=>context});
globalThis.wx={getStorageSync:k=>storage.get(k)||'',setStorageSync:(k,v)=>storage.set(k,v),getSystemInfoSync:()=>({screenWidth:390,screenHeight:844,pixelRatio:1,safeArea:{top:0,bottom:844}}),createOffscreenCanvas:()=>canvas(),createCanvas:canvas,createImage:()=>({width:128,height:128}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game');
const {Weapon,WEAPON_DEFS,PASSIVE_DEFS}=require('./src/Weapons');
const {STAGE_CONFIGS}=require('./src/StageSystem');
const {EVOLUTION_RECIPES,checkEvolutions,isEvolutionUnlocked,useEvolutionCore}=require('./src/Evolution');
const {CHARACTERS}=require('./src/Character');

test('imported gameplay modules match the supplied WeChat source byte for byte',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../games/emberfall/flux/source-manifest.json',import.meta.url)));
 assert.equal(manifest.modules.length,62);
 for(const item of manifest.modules){if(['src/scenes/TitleScene.js','src/RenderSystem.js','src/MapManager.js','src/Renderer.js','src/Enemy.js','src/Boss.js','src/scenes/CharSelectScene.js','src/Character.js','src/StageSystem.js','src/BossData.js','src/SpawnSystem.js','src/Player.js','src/ComboSystem.js','src/Gem.js','src/Pickup.js','src/Game.js'].includes(item.path))continue;
  const bytes=readFileSync(new URL('../games/emberfall/flux/'+item.path,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
 }
});

test('normal mode preserves all five four-minute chapters and source catalogs',()=>{
 assert.equal(STAGE_CONFIGS.length,5);assert.ok(STAGE_CONFIGS.every(s=>s.duration===240));
 assert.equal(STAGE_CONFIGS.reduce((n,s)=>n+s.duration,0),1200);
 assert.ok(Object.keys(WEAPON_DEFS).length>=30);assert.ok(Object.keys(PASSIVE_DEFS).length>=20);
 assert.equal(Object.keys(CHARACTERS).length,9);
});

test('art changes preserve original enemy, boss, chapter and character gameplay',()=>{
 const baseline=JSON.parse(readFileSync(new URL('../games/emberfall/flux/gameplay-baseline.json',import.meta.url)));
 function normalize(value){if(typeof value==='function')return value.toString();if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>k!=='name').map(([k,v])=>[k,normalize(v)]));return value;}
 const types={Enemy:require('./src/Enemy').Enemy,Boss:require('./src/Boss'),StageSystem:require('./src/StageSystem').StageSystem};
 for(const [name,type] of Object.entries(types))for(const [method,hash] of Object.entries(baseline[name])){
  assert.equal(createHash('sha256').update(type.prototype[method].toString()).digest('hex'),hash,`${name}.${method}`);
 }
 assert.deepEqual(normalize(CHARACTERS),baseline.characters);
 assert.deepEqual(normalize(STAGE_CONFIGS),baseline.stages);
 assert.deepEqual(normalize(require('./src/BossData')),baseline.bosses);
});

test('all chapters render the procedural courtyard without external ground images',()=>{
 const MapManager=require('./src/MapManager'),map=new MapManager();
 for(const stage of STAGE_CONFIGS){map.setStyle(stage.mapStyle);assert.doesNotThrow(()=>map.draw(context,-500,-300,1000,600,.016));assert.ok(map.scenery.ground);assert.ok(map.visibleProps(-500,-300,1000,600,{x:0,y:0}).length>5);}
});

test('weapon damage, cooldown cap and source evolution conditions are retained',()=>{
 const game={player:{might:1,cdr:0}};const weapon=new Weapon(game,'flux_bolt');
 assert.equal(weapon.damage,Math.floor(12*(1+.33)));assert.equal(weapon.interval,.8);
 weapon.level=6;assert.equal(weapon.damage,Math.floor(12*(1+6*.33)));
 game.player.cdr=10;assert.ok(Math.abs(weapon.interval-.08)<1e-10);
 const player={weapons:[weapon],hasPassive:id=>id==='overclocker',kills:199};
 assert.equal(checkEvolutions(player).length,1);assert.equal(isEvolutionUnlocked('flux_bolt',false,player,{}),false);
 player.kills=200;assert.equal(isEvolutionUnlocked('flux_bolt',false,player,{}),true);
 player.kills=0;useEvolutionCore('flux_bolt',player);assert.equal(isEvolutionUnlocked('flux_bolt',false,player,{}),true);
 assert.equal(EVOLUTION_RECIPES.flux_bolt.bonuses.damage,3);
});

test('each source character starts with its own real weapon and skill',()=>{
 for(const [id,c] of Object.entries(CHARACTERS)){
  const g=new Game(canvas());g.resize(390,844);g.startWithCharacter(id,[]);
  assert.equal(g.player.characterId,id);assert.equal(g.player.weapons[0].id,c.startWeapon);
  assert.ok(Number.isFinite(g.player.hp)&&g.player.hp>0);assert.ok(g.skillSystem);
 }
});

test('five chapter transitions require rewards and the final chapter settles once',()=>{
 const g=new Game(canvas());g.resize(390,844);g.startWithCharacter('tracer',[]);g._tutorialStep=-1;
 let victories=0;g.victoryEnd=()=>{victories++;g.isRunning=false;};
 for(let i=0;i<5;i++){
  g.time=(i+1)*240;g.stageSystem.stageTime=239.99;g.stageSystem.update(.02);
  if(i<4){assert.equal(g.isRunning,false);assert.equal(g.stageSystem.state,'reward');assert.equal(g.stageSystem.rewardOptions.length,3);g.stageSystem.applyReward(0);assert.equal(g.stageSystem.currentStage,i+1);assert.equal(g.isRunning,true);}
 }
 assert.equal(victories,1);
});

test('source battle updates and renders without browser or WeChat service dependencies',()=>{
 const g=new Game(canvas());g.resize(390,844);g.startWithCharacter('tracer',[]);g._tutorialStep=-1;g.autoPlay=true;g.autoUpgrade=true;
 for(let i=0;i<1800&&g.isRunning;i++){g.time+=1/60;g.update(1/60);if(i%60===0)g.draw();}
 assert.ok(g.player.kills>0);assert.ok(Number.isFinite(g.player.hp));
});

test('every imported weapon can run its actual update and rendering path',()=>{
 for(const id of Object.keys(WEAPON_DEFS)){
  const g=new Game(canvas());g.resize(390,844);g.startWithCharacter('tracer',[]);g._tutorialStep=-1;g.autoUpgrade=true;
  g.player.weapons=[new Weapon(g,id)];
  for(let i=0;i<12;i++)g._spawnEnemy(1,1,i*10);
  for(let i=0;i<120&&g.isRunning;i++){g.time+=1/60;g.update(1/60);}
  assert.doesNotThrow(()=>g.draw(),id);assert.ok(Number.isFinite(g.player.hp),id);
 }
});

test('scenery, enemies and the player draw once in foot-height order',()=>{
 const g=new Game(canvas());g.resize(1000,620);g.startWithCharacter('tracer',[]);g._tutorialStep=-1;
 const order=[],actor=(name,y)=>({x:0,y,draw(){order.push(name);}});
 g.mapManager.visibleProps=()=>[actor('foreground tree',40),actor('background pillar',-40)];
 g.enemies=[actor('enemy',-10)];g.bosses=[];g.player.draw=()=>order.push('player');g.player.y=0;
 g.draw();assert.deepEqual(order,['background pillar','enemy','player','foreground tree']);
});
