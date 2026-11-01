import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}},ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>ctx});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game'),{Enemy}=require('./src/Enemy'),Bullet=require('./src/Bullet'),Boss=require('./src/Boss'),Pickup=require('./src/Pickup');
const {RELIC_DEFS,grantRelic,getRandomRelics}=require('./src/Relic');
function start(hero){const g=new Game(canvas());g.startWithCharacter(hero,[]);g._tutorialStep=-1;g.enemies=[];g.bosses=[];g.bullets=[];g.enemyBullets=[];g.synergy.processSynergy=()=>{};g._checkWeaponCombo=()=>{};return g;}
function projectileKill(g,options){const e=new Enemy(g,500,500,'Bat');e.hp=e.maxHp=1;g.enemies=[e];g._getNearbyEnemies=()=>g.enemies.filter(e=>e.active);g.bullets=[new Bullet(g,e.x,e.y,0,0,100,options)];g._checkCollisions(1/60);return e;}

test('a lethal poison projectile triggers the real poison kill and character heal exactly once',()=>{
 const g=start('biohazard'),p=g.player;p.hp=50;
 const e=projectileKill(g,{poisonChance:1,poisonStacks:1});
 assert.equal(e.active,false);assert.equal(g.poisonKills,1);assert.equal(p.hp,53);assert.equal(p.totalHealed,3);
 g._checkCollisions(1/60);assert.equal(p.hp,53);assert.equal(g.poisonKills,1);
 const banned=start('biohazard');banned.player.hp=50;grantRelic(banned.player,RELIC_DEFS.find(r=>r.id==='overload_core'));
 projectileKill(banned,{poisonChance:1,poisonStacks:1});assert.equal(banned.player.hp,50,'normal healing bans still apply');
});

test('a lethal freeze projectile counts for fusion and triggers the actual frost death effect',()=>{
 const g=start('cryomancer'),e=new Enemy(g,500,500,'Bat'),near=new Enemy(g,520,500,'Bat');e.hp=e.maxHp=10;near.hp=near.maxHp=100;
 g.enemies=[e,near];g._getNearbyEnemies=()=>e.active?[e]:[];g.bullets=[new Bullet(g,500,500,0,0,100,{freezeChance:1,freezeDur:2})];
 g._checkCollisions(1/60);assert.equal(g.frozenKills,1);assert.equal(near.hp,95,'frost trait uses the killed enemy HP');
});

test('automatic growth skips the HP-sacrificing economy relic while manual choice retains its tradeoff',()=>{
 const g=start('biohazard'),p=g.player,relic=RELIC_DEFS.find(r=>r.id==='greed_protocol');g.autoUpgrade=true;
 g.upgradeSystem.generateOptions=()=>({options:[{type:'relic',id:relic.id,relic,rarity:'epic'},{type:'weapon_up',id:p.weapons[0].id}],previews:[]});
 g.showUpgradeScreen();assert.equal(p.maxHp,95);assert.equal(p.weapons[0].level,2);assert.equal(p.relics?.length||0,0);
 g.upgradeSystem.applyOption({type:'relic',id:relic.id,relic});assert.equal(p.maxHp,66);assert.equal(p.relicFlags.greedProtocol,true);
});

test('helpers cannot permanently sacrifice future healing even on a full-health starter with no current regeneration',()=>{
 const g=start('assassin'),p=g.player,relic=RELIC_DEFS.find(r=>r.id==='overload_core');g.autoUpgrade=true;
 assert.equal(p.hp,p.maxHp);assert.equal(p.regen,0);
 g.upgradeSystem.generateOptions=()=>({options:[{type:'relic',id:relic.id,relic},{type:'weapon_up',id:p.weapons[0].id}],previews:[]});
 g.showUpgradeScreen();assert.equal(p.canHeal,true);assert.equal(p.weapons[0].level,2);assert.equal(p.relicFlags?.overloadCore,undefined);
 p.hp=20;assert.equal(p.heal(30),30);assert.equal(p.hp,50,'later healing must remain available');
 g.upgradeSystem.applyOption({type:'relic',id:relic.id,relic});assert.equal(p.canHeal,false,'manual sacrifice remains an explicit choice');
 const h=start('assassin');h.autoUpgrade=true;h.upgradeSystem.generateOptions=()=>({options:RELIC_DEFS.filter(r=>r.requiresChoice).map(r=>({type:'relic',id:r.id,relic:r})),previews:[]});
 h.showUpgradeScreen();assert.equal(h.player.canHeal,true);assert.equal(h.player.maxHp,65);assert.equal(h.isRunning,true,'an all-risk fallback must neither choose a sacrifice nor stall helpers');
});

test('a fast watcher evades a slower receding projectile it would catch, but not one that outruns it',()=>{
 const g=start('assassin'),p=g.player;p.x=p.y=0;g.gems=[{active:true,x:300,y:0,value:10}];g.pickups=[];
 g.input.vector={x:1,y:0};g.enemyBullets=[{active:true,x:55,y:0,vx:200,vy:0,radius:6}];
 g._updateAutoPlayAI(.13);assert.ok(Math.abs(g.input.vector.y)>.5,'relative closing speed must trigger lateral evasion');
 g._aiTimer=0;g._aiVector=null;g.input.vector={x:1,y:0};g.enemyBullets[0].vx=1000;g._updateAutoPlayAI(.13);
 assert.ok(g.input.vector.x>.9);assert.ok(Math.abs(g.input.vector.y)<.1,'a genuinely departing projectile stays ignored');
});

test('an enemy volley grants a short reaction window without reducing individual damage or dash protection',()=>{
 const g=start('assassin'),p=g.player;
 const volley=()=>Array.from({length:3},()=>({active:true,x:p.x,y:p.y,radius:6,damage:12}));
 g.enemyBullets=volley();g._checkCollisions(1/60);assert.equal(p.hp,53);assert.equal(g.playerInvincible,.2);assert.ok(g.enemyBullets.every(b=>!b.active));
 g.enemyBullets=[];g.spawnTimer=g.bossTimer=999;for(let i=0;i<20;i++)g.update(1/60);assert.ok(g.playerInvincible<=0);
 g.enemyBullets=volley();g._checkCollisions(1/60);assert.equal(p.hp,41,'a later volley still deals the original 12 damage');
 g.playerInvincible=.35;g.enemyBullets=volley();g._checkCollisions(1/60);assert.equal(p.hp,41);assert.equal(g.playerInvincible,.35,'existing dash immunity is not shortened');
});

test('helpers spend a ready normal dash on an imminent projectile collision, obeying cooldown and manual control',()=>{
 const g=start('assassin'),p=g.player;p.x=p.y=0;g.gems=[];g.pickups=[];g.input.vector={x:0,y:0};
 g.enemyBullets=[{active:true,x:30,y:0,vx:-300,vy:0,radius:6}];g._updateAutoPlayAI(.13);
 assert.ok(p.dashCooldown>0);assert.ok(g.playerInvincible>0);assert.ok(Number.isFinite(p.dashAngle));
 const h=start('assassin');h.player.x=h.player.y=0;h.gems=[];h.pickups=[];h.input.vector={x:0,y:0};h.enemyBullets=[{active:true,x:30,y:0,vx:-300,vy:0,radius:6}];
 h.player.dashCooldown=1;h._updateAutoPlayAI(.13);assert.equal(h.player.dashActiveTimer,0);
 h.player.dashCooldown=0;h.input.active=true;h._aiTimer=0;h._updateAutoPlayAI(.13);assert.equal(h.player.dashCooldown,0);
});

test('unprompted random relics cannot impose a life or healing sacrifice, while choice pools retain both',()=>{
 const g=start('biohazard');
 const automatic=getRandomRelics(g.player,100,{automatic:true}),manual=getRandomRelics(g.player,100);
 for(const id of ['greed_protocol','overload_core']){assert.ok(!automatic.some(r=>r.id===id));assert.ok(manual.some(r=>r.id===id));}
 assert.ok(automatic.some(r=>r.id==='echo_chip'),'ordinary rewards remain available');
});

test('imminent ground escape overrides later warnings, loot and steering inertia without a ready dash',()=>{
 const g=start('assassin'),p=g.player;p.x=p.y=0;g.autoPlay=g.autoUpgrade=true;
 g.input.vector={x:1,y:0};g._aiVector={x:1,y:0};p.dashCooldown=2;
 g.gems=[{active:true,x:300,y:0,value:10,update(){}}];g.pickups=[];g.spawnTimer=g.bossTimer=999;g.skillSystem.cooldown=999;
 g.mortarWarnings=[{active:true,x:90,y:0,radius:100,damage:100,timer:.18},{active:true,x:-40,y:0,radius:100,damage:100,timer:.7}];
 const hp=p.hp;for(let i=0;i<60;i++){g.time+=1/60;g.update(1/60);}
 assert.equal(p.hp,hp,'normal movement must clear both real blast checks');assert.equal(g.mortarWarnings.length,0);
 assert.equal(p.dashActiveTimer,0,'survival must not bypass the existing dash cooldown');
});

test('helpers react to an active boss shockwave with a normal ready dash after its telegraph ends',()=>{
 const g=start('assassin'),p=g.player;p.x=160;p.y=0;g.autoPlay=g.autoUpgrade=true;
 g.gems=[];g.pickups=[];g.spawnTimer=g.bossTimer=999;g.skillSystem.cooldown=999;
 const b=new Boss(g,1);Object.assign(b,{x:0,y:0,speed:0,damage:0,skillTimer:999,_behaviorTimer:999,telegraph:null,_sustainedEffect:{type:'shockwave',timer:.7,radius:60,speed:520,triggered:false}});g.bosses=[b];
 const hp=p.hp;for(let i=0;i<45;i++){g.time+=1/60;g.update(1/60);}
 assert.equal(p.hp,hp,'the expanding real wave must not hit a watcher with a ready dash');assert.ok(p.dashCooldown>0);
});

test('late high speed refreshes stale helper steering before crossing into a real imminent blast',()=>{
 const g=start('assassin'),p=g.player;p.x=107;p.y=0;p.baseSpeed=2400;p.bonusSpeed=0;p.dashCooldown=2;
 g.autoPlay=g.autoUpgrade=true;g.spawnTimer=g.bossTimer=999;g.skillSystem.cooldown=999;g.gems=[];g.pickups=[];
 g._aiTimer=.1;g._aiVector={x:-1,y:0};g.input.vector={x:-1,y:0};
 g.mortarWarnings=[{active:true,x:0,y:0,radius:100,damage:400,timer:1/60}];
 const hp=p.hp;g.time+=1/60;g.update(1/60);
 assert.equal(p.hp,hp,'cached direction must not carry a fast watcher into the actual explosion');
 assert.ok(p.x>107);assert.equal(p.dashActiveTimer,0,'escape still uses ordinary movement');
});

test('helper refresh budget accounts for the next whole movement frame rather than rounding travel upward',()=>{
 const g=start('assassin'),p=g.player;p.x=115;p.y=0;p.baseSpeed=1080;p.bonusSpeed=0;p.dashCooldown=2;
 g.autoPlay=g.autoUpgrade=true;g.spawnTimer=g.bossTimer=999;g.skillSystem.cooldown=999;g.gems=[];g.pickups=[];
 g._aiTimer=24/p.speed;g._aiVector={x:-1,y:0};g.input.vector={x:-1,y:0};
 g.mortarWarnings=[{active:true,x:0,y:0,radius:100,damage:400,timer:1/60}];
 const hp=p.hp;g.time+=1/60;g.update(1/60);assert.equal(p.hp,hp);assert.ok(p.x>115);
});

test('starter shadow clones can acquire and damage a lone real boss without ordinary mobs',()=>{
 const g=start('assassin');g.player.x=g.player.y=0;g.spawnTimer=g.bossTimer=999;g.skillSystem.cooldown=999;
 const b=new Boss(g,1);Object.assign(b,{x:200,y:0,speed:0,damage:0,hp:10000,maxHp:10000,skillTimer:999,_behaviorTimer:999});g.bosses=[b];
 for(let i=0;i<360;i++){g.time+=1/60;g.update(1/60);}
 assert.ok(b.hp<10000,'the actual starter shots must reach a boss absent from the ordinary-enemy grid');
 assert.ok(g._weaponDamageStats.shadow_clone>0,'damage must retain the starter weapon attribution');
});

test('a wounded helper prioritizes the real potion over a chest and receives its actual healing',()=>{
 const g=start('assassin'),p=g.player;p.x=p.y=0;p.hp=20;g.autoPlay=g.autoUpgrade=true;
 g.gems=[];g.spawnTimer=g.bossTimer=999;g.skillSystem.cooldown=999;
 const potion=new Pickup(g,100,0,'potion');g.pickups=[potion,new Pickup(g,-150,0,'chest')];
 g._updateAutoPlayAI(1/60);assert.ok(g.input.vector.x>.5,'the healing item must win the real target comparison');
 for(let i=0;i<120&&potion.active;i++){g.time+=1/60;g.update(1/60);}
 assert.equal(potion.active,false);assert.equal(p.hp,50);assert.equal(p.totalHealed,30);
});

test('helpers do not seek traps or unusable real healing pickups instead of a useful chest',()=>{
 for(const state of ['full','no-heal','no-pickup']){
  const g=start('assassin'),p=g.player;p.x=p.y=0;if(state!=='full')p.hp=20;
  g.curseNoHeal=state==='no-heal';g.curseNoPickup=state==='no-pickup';g.gems=[];
  g.pickups=[new Pickup(g,50,0,'trap'),new Pickup(g,100,0,'potion'),new Pickup(g,110,0,'heal_shrine'),new Pickup(g,-200,0,'chest')];
  g._updateAutoPlayAI(1/60);assert.ok(g.input.vector.x<-.5,state+': ordinary pathing must not chase harmful or unusable pickups');
 }
});
