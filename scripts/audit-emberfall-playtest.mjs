// Deterministic engine playthroughs with normal HP, damage and in-game helpers.
// These are simulation evidence, not a claim of manual/browser completion.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:390,height:844,getContext:()=>context});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:390,screenHeight:844,pixelRatio:1,safeArea:{top:0,bottom:844}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
globalThis.browserCanvas=canvas();
const {CHARACTERS}=require('./src/Character');
const originalRandom=Math.random;
const seconds=Number(process.argv[2]||180),heroFilter=process.argv[3],rows=[];
try{
 for(const [width,height] of [[390,844],[1280,720]])for(const [id] of Object.entries(CHARACTERS)){
  if(heroFilter&&heroFilter!==id)continue;
  let seed=42;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  delete require.cache[require.resolve('./entry.js')];
  const {game:g,sm}=require('./entry.js');g.resize(width,height);g.startWithCharacter(id,[]);g._tutorialStep=-1;g.autoPlay=true;g.autoUpgrade=true;sm.switchTo('playing');
  let frames=0,peakEnemies=0,peakBosses=0,rewards=0;
  while(!g._runSettled&&g.player.hp>0&&g.time<seconds){
   if(!g.isRunning){
    if(sm.currentSceneName==='upgrade'&&sm.currentScene.options?.length){sm.currentScene.onSelect(sm.currentScene.options[0]);rewards++;}
    else if(g.stageSystem?.state==='reward'){g.stageSystem.applyReward(0);rewards++;}
    else break;
   }
   g.time+=1/60;g.frameDt=1/60;g.update(1/60);frames++;
   if(g.stageSystem?.state==='reward'){g.stageSystem.applyReward(0);rewards++;}
   for(const value of [g.player.x,g.player.y,g.player.hp,g.player.maxHp,g.player.xp,g.player.maxXp,g.player.speed,g.player.might])assert.ok(Number.isFinite(value),`${id}: non-finite player state`);
   for(const e of [...g.enemies,...g.bosses])if(e.active)for(const value of [e.x,e.y,e.hp,e.speed])assert.ok(Number.isFinite(value),`${id}: non-finite ${e.type||e.name} state`);
   peakEnemies=Math.max(peakEnemies,g.enemies.length);peakBosses=Math.max(peakBosses,g.bosses.length);
   assert.ok(frames<seconds*61+100,'simulation stalled');
  }
  assert.ok(g._runSettled||g.time>=seconds||sm.currentSceneName==='gameOver',`${id}: stopped without a result at ${g.time}`);
  const row={width,hero:id,time:Math.floor(g.time),alive:!g._runSettled&&g.player.hp>0,scene:sm.currentSceneName,chapter:g.stageSystem?.currentStage+1,hp:Math.round(g.player.hp),kills:g.player.kills,level:g.player.level,peakEnemies,peakBosses,rewards};rows.push(row);console.log(JSON.stringify(row));
 }
}finally{Math.random=originalRandom;}
console.log(JSON.stringify({runs:rows.length,secondsLimit:seconds,alive:rows.filter(r=>r.alive).length,minTime:Math.min(...rows.map(r=>r.time)),maxTime:Math.max(...rows.map(r=>r.time))}));
