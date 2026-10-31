import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}};
let strokes=0;
const context=new Proxy({measureText:value=>({width:String(value).length*7}),stroke(){strokes++;},fill(){strokes++;},createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>context});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game');
const {DEITIES,BLESSINGS,Pantheon,divineStage,pulseValues,blessingPreview,preferBlessing}=require('./src/Pantheon');
const {SKILL_ART,drawNightMagic,drawIcon,makeSkillEffect}=require('./src/NightMagic');
const {CHARACTERS}=require('./src/Character');
function start(patron='ember',hero='tracer'){
 const g=new Game(canvas());g.selectedPatron=patron;g.startWithCharacter(hero,[]);g._tutorialStep=-1;return g;
}
function grant(g,id,rank=(g.pantheon.ranks[id]||0)+1){return g.pantheon.grant({id,rank,type:'blessing'});}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} = ${b}`);

test('eight patrons have distinct real opening bonuses and all modes restart without stacking',()=>{
 assert.equal(Object.keys(DEITIES).length,8);assert.equal(BLESSINGS.length,24);
 assert.equal(new Set(BLESSINGS.map(b=>b.id)).size,24);
 const baseline=start(null).player,signatures=new Set();
 for(const [id,def] of Object.entries(DEITIES)){
  assert.equal(BLESSINGS.filter(b=>b.deity===id).length,3);
  const g=start(id),p=g.player;
  for(const [key,v] of Object.entries(def.stats))approx(p[key],(baseline[key]||0)+v);
  if(def.health){assert.equal(p.maxHp,baseline.maxHp+def.health);assert.equal(p.hp,p.maxHp);}
  if(def.dash)approx(p.dashMaxCooldown,3*def.dash);
  signatures.add(JSON.stringify([p.bonusMight,p.bonusSpeed,p.bonusArmor,p.bonusCdr,p.maxHp,p.bonusXp,p.luckyChance,p.thornDamage]));
  grant(g,BLESSINGS.find(b=>b.deity===id).id);g.skillSystem.tryUse();
  g.startWithCharacter('tracer',[]);assert.deepEqual(g.pantheon.ranks,{});assert.deepEqual(g.skillSystem.visualEffects,[]);
  for(const [key,v] of Object.entries(def.stats))approx(g.player[key],(baseline[key]||0)+v);
  g.startBossRush('tracer');assert.equal(g.pantheon.patron,id);
 }
 assert.equal(signatures.size,8);
});

test('all 24 blessings enforce ranks, reject stale choices and exhaust their finite pool',()=>{
 const g=start(),oath=g.pantheon;let count=0;
 const random=Math.random;Math.random=()=>.1;
 try{for(let i=0;i<100;i++){
  const option=oath.offer();if(!option)break;
  assert.equal(oath.grant(option),true);assert.equal(oath.grant(option),false,'stale option cannot apply twice');count++;
 }}finally{Math.random=random;}
 assert.equal(count,70);assert.equal(oath.offer(),null);
 for(const b of BLESSINGS)assert.equal(oath.ranks[b.id],b.maxRank);
 assert.equal(grant(g,'boon_missing'),false);assert.equal(grant(g,BLESSINGS[0].id,NaN),false);
 assert.ok(g.player.armor<=.6);assert.ok(g.player.cdr<=.5);
});

test('every third level adds a real divine choice while preserving weapon choices and banishment',()=>{
 const g=start();g.player.level=2;assert.equal(g.upgradeSystem.generateOptions().options.some(o=>o.type==='blessing'),false);
 g.player.level=3;const options=g.upgradeSystem.generateOptions().options;
 assert.equal(options.length,4);const b=options.find(o=>o.type==='blessing');assert.ok(b);g.upgradeSystem.applyOption(b);assert.equal(g.pantheon.ranks[b.id],1);
 g.upgradeSystem.banishList=BLESSINGS.map(b=>b.id);assert.equal(g.upgradeSystem.generateOptions().options.some(o=>o.type==='blessing'),false);
 g.upgradeSystem.banishList=[];g.player.relicFlags={quantumDice:true};
 const five=g.upgradeSystem.generateOptions().options;assert.equal(five.length,5);assert.ok(five.some(o=>o.type==='blessing'));
});

test('healing respects the no-heal curse and records only actual restored health',()=>{
 const initial=start(null);initial.curseNoHeal=true;initial.pantheon=new Pantheon(initial,'grove');assert.equal(initial.player.hp,initial.player.maxHp);assert.equal(initial.player.totalHealed,0,'opening attributes are not combat healing');
 const g=start('grove'),p=g.player;p.hp=p.maxHp-1;const healed=p.totalHealed;
 grant(g,'boon_root');assert.equal(p.totalHealed,healed+12);assert.equal(p.hp,p.maxHp-1);
 g.curseNoHeal=true;const old=p.hp;grant(g,'boon_root');assert.equal(p.hp,old);assert.equal(p.totalHealed,healed+12);
 grant(g,'boon_bell');g.pantheon.update(8);assert.equal(p.hp,old);
 g.curseNoHeal=false;p.hp=p.maxHp-1;g.pantheon.update(8);assert.equal(p.hp,p.maxHp);assert.equal(p.totalHealed,healed+13);
});

test('fire, lightning, frost and dawn pulses apply distinct bounded combat effects and pause freezes them',()=>{
 for(const [id,kind] of [['boon_breath','ember'],['boon_chain','storm'],['boon_tide','moon'],['boon_bell','dawn']]){
  const g=start(),p=g.player;g.player.bonusArea=0;const calls=[];
  g.enemies=Array.from({length:5},(_,i)=>({x:p.x+20+i*10,y:p.y,active:true,takeDamage:(n,source)=>calls.push([n,source])}));
  const boss={x:p.x+90,y:p.y,active:true,takeDamage:(n,source)=>calls.push([n,source])};g.bosses=[boss];
  const outside={x:p.x+1000,y:p.y,active:true,takeDamage(){throw Error('outside range');}};g.enemies.push(outside);
  grant(g,id);const def=BLESSINGS.find(b=>b.id===id);g.isPaused=true;g.pantheon.update(def.interval*2);assert.equal(calls.length,0);assert.equal(g.pantheon.timers[id],def.interval);
  g.isPaused=false;g.pantheon.update(def.interval);
  if(kind==='moon'){assert.ok(g.enemies[0].frozen>0);assert.equal(boss.frozen,undefined);assert.equal(boss.slowed,1);assert.equal(calls.length,0);}
  else{assert.equal(calls.length,kind==='storm'?3:6);assert.ok(calls.every(([n,s])=>n>0&&s===id));}
  assert.ok(g.pantheon.effects.some(e=>e.kind===kind));
 }
});

test('wind dodge and night experience bonuses reach the original movement and progression systems',()=>{
 const wind=start('wind');const before=wind.player.dashMaxCooldown;grant(wind,'boon_evade');approx(wind.player.dashMaxCooldown,before*.9);
 wind.player.dash();approx(wind.player.dashCooldown,2.43);
 const night=start('night');night.player.gainXp(10);approx(night.player.xp,11);
 const forge=start('forge');const e={active:true,x:0,y:0,hp:100,takeDamage(n){this.hp-=n;}};
 forge.player.takeDamage(10,e,true);assert.ok(e.hp<100);
});

test('nine active spells and eight sigils render deterministic matching effects with no state changes',()=>{
 const random=Math.random;
 for(const hero of Object.keys(CHARACTERS)){
  assert.ok(SKILL_ART[hero]);const g=start('ember',hero),p=g.player;
  g.enemies=[g._createEnemy(p.x+70,p.y,'Bat')];g.enemies[0].hp=1e6;g.enemies[0].maxHp=1e6;
  assert.equal(g.skillSystem.tryUse(),true);assert.equal(g.skillSystem.visualEffects[0].kind,hero);
  const before=JSON.stringify([g.skillSystem.visualEffects,p.hp,p.bonusMight,p.bonusSpeed,p.turrets,g.enemies[0].hp]);
  Math.random=()=>{throw Error('art consumed combat RNG');};strokes=0;
  try{for(const age of [0,.3,.7]){g.skillSystem.visualEffects[0].age=age;drawNightMagic(context,g);}drawIcon(context,'skill_'+hero,0,0,64);}finally{Math.random=random;g.skillSystem.visualEffects[0].age=0;}
  assert.ok(strokes>0);assert.equal(JSON.stringify([g.skillSystem.visualEffects,p.hp,p.bonusMight,p.bonusSpeed,p.turrets,g.enemies[0].hp]),before);
  g.isPaused=true;const cd=g.skillSystem.cooldown;g.skillSystem.update(1);assert.equal(g.skillSystem.cooldown,cd);assert.equal(g.skillSystem.visualEffects[0].age,0);
  g.isPaused=false;g.skillSystem.update(30);assert.equal(g.skillSystem.visualEffects.length,0);
 }
 Math.random=()=>{throw Error('sigil consumed combat RNG');};try{for(const id of Object.keys(DEITIES))drawIcon(context,'god_'+id,0,0,64);}finally{Math.random=random;}
});

test('area spell visuals use the same original skill radii including the viewport and range bonus',()=>{
 const g=start('moon');g.player.bonusArea=.5;
 for(const [id,radius] of [['cryomancer',Math.max(540,Math.hypot(g.width,g.height)*.58)*1.5],['biohazard',640],['assassin',247.5]]){
  g.player.characterId=id;approx(makeSkillEffect(g,{x:0,y:0}).radius,radius);
 }
});

test('divine growth is bounded at 20/40/60 levels and retains late damage, healing and lightning reach',()=>{
 const g=start(),fire=BLESSINGS.find(b=>b.id==='boon_breath'),storm=BLESSINGS.find(b=>b.id==='boon_chain'),dawn=BLESSINGS.find(b=>b.id==='boon_bell');
 for(const [level,power,targets] of [[1,1,3],[19,1,3],[20,1.5,4],[40,2,5],[60,2.5,6],[200,2.5,6]]){
  g.player.level=level;assert.equal(divineStage(level).power,power);approx(pulseValues(g,fire,3).damage,36*g.player.might*power);assert.equal(pulseValues(g,storm,3).targets,targets);approx(pulseValues(g,dawn,3).healing,6*power);
 }
 const frost=BLESSINGS.find(b=>b.id==='boon_tide');g.player.level=200;approx(pulseValues(g,frost,3).freeze,1.8);
});

test('real divine contribution records ignore immunity, overkill, full-health healing and paused time',()=>{
 const g=start(),p=g.player;p.level=60;p.hp=p.maxHp-1;
 const immune={x:p.x,y:p.y,active:true,hp:100,shield:0,takeDamage(){}},target={x:p.x+5,y:p.y,active:true,hp:5,shield:0,takeDamage(n){this.hp-=n;}};
 g.enemies=[immune,target];g.bosses=[];grant(g,'boon_bell');g.pantheon.update(8);
 assert.deepEqual(g.pantheon.metrics.boon_bell,{casts:1,hits:2,damage:5,healing:1,controlled:0});
 const before=JSON.stringify(g.pantheon.metrics);g.isPaused=true;g.pantheon.update(100);assert.equal(JSON.stringify(g.pantheon.metrics),before);
 g.startWithCharacter('tracer',[]);assert.deepEqual(g.pantheon.metrics,{});
});

test('divine previews use actual diminishing returns and caps without changing the player',()=>{
 const g=start('moon'),p=g.player;p.bonusArmor=8;p.bonusCdr=.8;
 const before=JSON.stringify([p.hp,p.bonusArmor,p.bonusCdr,p.bonusMight,p.totalHealed]);
 for(const id of ['boon_mail','boon_chant','boon_coal','boon_thorn','boon_still']){
  const preview=blessingPreview(g,{id,rank:1});assert.ok(preview.lines.length);
  if(id==='boon_mail'){assert.ok(preview.warnings.some(s=>s.includes('已达上限')));assert.equal(preview.useful,false);}
  if(id==='boon_chant'){assert.equal(preview.useful,false);assert.ok(preview.warnings.length);}
  if(id==='boon_thorn'||id==='boon_still')assert.equal(preview.useful,false);
 }
 assert.equal(JSON.stringify([p.hp,p.bonusArmor,p.bonusCdr,p.bonusMight,p.totalHealed]),before);
});

test('helper leaves early weapon growth intact and avoids capped or irrelevant god choices',()=>{
 const g=start('moon'),p=g.player,boon={type:'blessing',id:'boon_mail',deity:'moon',rank:1};
 p.level=3;p.weapons[0].level=3;assert.equal(preferBlessing(g,[boon]),null);
 p.level=6;assert.equal(preferBlessing(g,[boon]),boon);p.bonusArmor=8;assert.equal(preferBlessing(g,[boon]),null);
 assert.equal(preferBlessing(g,[{type:'blessing',id:'boon_still',deity:'moon',rank:1}]),null);
 p.hp=p.maxHp*.2;const root={type:'blessing',id:'boon_root',deity:'grove',rank:1};assert.equal(preferBlessing(g,[root]),root);
 g.curseNoHeal=true;assert.equal(preferBlessing(g,[root]),null);
});

test('the same freeze percentage applies to frost projectiles, nova, active spell and moon pulse',()=>{
 const g=start('moon','cryomancer'),p=g.player;p.bonusFreezeDur=.5;
 const {Weapon}=require('./src/Weapons');const ice=new Weapon(g,'ice_shard');ice._fireIceShard(p,[]);assert.ok(g.bullets.length>0);approx(g.bullets[0].freezeDur,.75);
 const e=g._createEnemy(p.x+10,p.y,'Bat');e.hp=1e6;g.enemies=[e];g._getNearbyEnemies=()=>[e];
 new Weapon(g,'glacial_nova')._fireGlacialNova(p);approx(e.frozen,1.5);
 e.frozen=0;g.skillSystem.tryUse();approx(e.frozen,6);
 new Weapon(g,'glacial_nova')._fireGlacialNova(p);approx(e.frozen,6,'weaker nova never shortens an active spell');
 const random=Math.random;Math.random=()=>0;
 try{g._checkCollisions(1/60);}finally{Math.random=random;}
 approx(e.frozen,6,'weaker projectile never shortens an active spell');
 approx(pulseValues(g,BLESSINGS.find(b=>b.id==='boon_tide'),1).freeze,.9);
});

test('night experience, relic and curse bonuses apply once on actual killed-enemy gems',()=>{
 const g=start('night'),p=g.player;p.maxXp=1e9;g.particles.emit=()=>{};
 for(const [bonus,relic,curse,expected] of [[.1,false,1,22],[.18,false,1,23.6],[.18,true,1,29.5],[.18,true,.5,14.75]]){
  p.bonusXp=bonus;p.relicFlags={xpBoost:relic};g.curseXpMult=curse;g._gemChainCount=0;
  const enemy=g._createEnemy(p.x,p.y,'Bat');enemy.xpValue=20;g.enemies=[enemy];g.gems=[];
  const before=p.totalXp;enemy.die();assert.equal(g.gems.length,1);assert.equal(g.gems[0].value,20,'the drop is not pre-multiplied');
  g.gems[0].update(1/60);approx(p.totalXp-before,expected);
 }
});

test('divine healing respects the life-burning relic while maximum life still grows',()=>{
 const g=start('dawn'),p=g.player;p.relicFlags={overloadCore:true};p.hp=10;
 const total=p.totalHealed,max=p.maxHp;
 g.pantheon.grant({type:'blessing',id:'boon_vigil',rank:1});
 assert.equal(p.maxHp,max+10);assert.equal(p.hp,10);
 g.pantheon.grant({type:'blessing',id:'boon_bell',rank:1});g.pantheon.update(8);
 assert.equal(p.hp,10);assert.equal(p.totalHealed,total);assert.equal(g.pantheon.metrics.boon_bell.healing,0);
 assert.ok(blessingPreview(g,{id:'boon_sap',rank:1}).warnings.some(s=>s.includes('禁疗')));
 assert.equal(blessingPreview(g,{id:'boon_sap',rank:1}).useful,false);
});
