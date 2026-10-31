// Real engine, ordinary starter stats and normal helpers. Simulation, not browser play.
import {createRequire} from 'node:module';
import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const flags=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...v]=arg.replace(/^--/,'').split('=');return [key,v.join('=')];}));
const require=createRequire(flags.source?pathToFileURL(resolve(flags.source)):new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}},ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>ctx});
let now=0;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
globalThis.browserCanvas=canvas();
const {DEITIES}=require('./src/Pantheon');
const campProfile=flags['camp-profile']?JSON.parse(readFileSync(flags['camp-profile'],'utf8')):null;
if(campProfile){const defs=require('./src/MetaSystem').META_UPGRADES;for(const [id,level] of Object.entries(campProfile)){const def=defs.find(d=>d.id===id);assert.ok(def&&Number.isInteger(level)&&level>=0&&level<=def.maxLevel,'invalid camp level: '+id);}}
const talentProfile=flags['talent-profile']?JSON.parse(readFileSync(flags['talent-profile'],'utf8')):null;
if(talentProfile){const {NODE_MAP}=require('./src/TalentTree');for(const [id,owned] of Object.entries(talentProfile)){assert.ok(NODE_MAP[id]&&owned===true,'invalid recorded talent: '+id);const req=NODE_MAP[id].req;for(const prerequisite of req?(Array.isArray(req)?req:[req]):[])assert.ok(talentProfile[prerequisite],'missing talent prerequisite: '+id);}}
const gods=flags.gods?flags.gods.split(','):['none',...Object.keys(DEITIES)],seeds=(flags.seeds||'42').split(',').map(Number),heroes=(flags.heroes||'tracer').split(',');
const pairs=flags.pairs?flags.pairs.split(',').map(p=>p.split(':')):heroes.flatMap(hero=>gods.map(god=>[hero,god]));
for(const pair of pairs)assert.ok(pair.length===2&&Object.hasOwn(require('./src/Character').CHARACTERS,pair[0])&&(pair[1]==='none'||Object.hasOwn(DEITIES,pair[1])),'unknown hero/patron pair: '+pair.join(':'));
const seconds=Number(flags.seconds||1202),step=Number(flags.dt||1/30),rows=[];
const originalRandom=Math.random;
try{
 for(const [hero,patron] of pairs)for(const originalSeed of seeds){
  let rng=originalSeed>>>0;Math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;};
  now=0;delete require.cache[require.resolve('./entry.js')];
  const {game:g,sm}=require('./entry.js');g.resize(Number(flags.width||1000),Number(flags.height||620));g.selectedPatron=patron==='none'?null:patron;
  if(campProfile)g.meta.data.upgrades={...campProfile};
  if(talentProfile)g.meta.data.talentNodes={...talentProfile};
  g.startWithCharacter(hero,[]);g._tutorialStep=-1;g.autoPlay=g.autoUpgrade=true;sm.switchTo('playing');
  const checkpoints=[],bosses=new Map(),boonChoices=[],originalGrant=g.pantheon.grant.bind(g.pantheon);
  g.pantheon.grant=option=>{const result=originalGrant(option);if(result)boonChoices.push({time:+g.time.toFixed(2),level:g.player.level,id:option.id,rank:option.rank});return result;};
  const incoming={},impacts=[],growth=[],takeDamage=g.player.takeDamage.bind(g.player),gainXp=g.player.gainXp.bind(g.player);
  g.player.takeDamage=(amount,source,continuous)=>{const before=g.player.hp,result=takeDamage(amount,source,continuous),lost=Math.max(0,before-g.player.hp);if(lost){if(!continuous&&impacts.length<100)impacts.push({time:+g.time.toFixed(3),amount:+lost.toFixed(2),caller:new Error().stack.split('\n')[2]?.trim().replace(/ \(.*/, '')});const key=source?.type||source?.name||(continuous?'terrain':'projectile-or-boss-skill');incoming[key]=(incoming[key]||0)+lost;}return result;};
  g.player.gainXp=amount=>{const level=g.player.level;const result=gainXp(amount);if(g.player.level!==level&&g.player.level<=20)growth.push({time:+g.time.toFixed(2),level:g.player.level});return result;};
  let frames=0,peak=0,minHp=1,rewards=0,next=60;
  const snap=()=>({time:Math.round(g.time),level:g.player.level,kills:g.player.kills,hp:+Math.max(0,g.player.hp).toFixed(1),maxHp:g.player.maxHp,might:+g.player.might.toFixed(3),bonusMight:g.player.bonusMight,armor:g.player.armor,area:+g.player.area.toFixed(2),heal:+g.player.totalHealed.toFixed(1),damage:Math.round(g.player.totalDamage),skillUses:g.skillUseCount||0,divine:JSON.parse(JSON.stringify(g.pantheon.metrics)),boons:{...g.pantheon.ranks},weapons:g.player.weapons.map(w=>({id:w.id,level:w.level,evolved:w.evolved}))});
  while(!g._runSettled&&g.player.hp>0&&g.time<seconds){
   if(!g.isRunning){if(sm.currentSceneName==='upgrade'&&sm.currentScene.options?.length)sm.currentScene.onSelect(sm.currentScene.options[0]);else if(g.stageSystem?.state==='reward')g.stageSystem.applyReward(0);else break;rewards++;}
   g.time+=step;now=g.time*1000;g.frameDt=step;g.update(step);frames++;
   for(const b of g.bosses){if(!bosses.has(b))bosses.set(b,{name:b.name,start:+g.time.toFixed(2),hp:b.maxHp});}
   for(const [b,record] of bosses)if(!b.active&&record.end===undefined)record.end=+g.time.toFixed(2);
   if(g.stageSystem?.state==='reward'){g.stageSystem.applyReward(0);rewards++;}
   for(const value of [g.player.x,g.player.y,g.player.hp,g.player.maxHp,g.player.might])assert.ok(Number.isFinite(value),`${patron}: non-finite player`);
   peak=Math.max(peak,g.enemies.length);minHp=Math.min(minHp,Math.max(0,g.player.hp/g.player.maxHp));
   if(g.time>=next){checkpoints.push(snap());next+=next<240?180:240;}
   if(frames%900===0)g.draw();
   assert.ok(frames<seconds/step+500,'simulation stalled');
  }
  const row={hero,patron,seed:originalSeed,dt:step,width:g.width,time:+g.time.toFixed(2),victory:!!sm.scenes.gameOver.data?.victory,dead:g.player.hp<=0,scene:sm.currentSceneName,chapter:(g.stageSystem?.currentStage||0)+1,...snap(),minHp:+minHp.toFixed(3),peak,rewards,boonChoices,incoming,impacts,growth,bySource:g._weaponDamageStats,divine:g.pantheon.metrics||{},bosses:[...bosses.values()].map(b=>({...b,seconds:b.end===undefined?null:+(b.end-b.start).toFixed(2)})),checkpoints};
  rows.push(row);console.log(JSON.stringify({hero,patron,seed:originalSeed,time:row.time,victory:row.victory,kills:row.kills,level:row.level,boons:boonChoices.length,bosses:row.bosses.length,minHp:row.minHp}));
  if(flags.out)writeFileSync(flags.out,JSON.stringify({method:'engine simulation, '+(campProfile?'recorded camp upgrade profile':'starter stats')+(talentProfile?' and recorded talents':'')+', normal helpers, no forced in-run rewards or invulnerability',campProfile,talentProfile,seconds,rows},null,2));
 }
}finally{Math.random=originalRandom;}
