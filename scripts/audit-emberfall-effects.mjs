// Deliberate stationary stress fixtures; these are not normal playthroughs or GPU/FPS claims.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
const flags=Object.fromEntries(process.argv.slice(2).map(v=>{const [k,...a]=v.replace(/^--/,'').split('=');return [k,a.join('=')];}));
const require=createRequire(pathToFileURL(resolve(flags.source||'games/emberfall/flux/entry.js')));
const gradient={addColorStop(){}},ctx=new Proxy({globalAlpha:1}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>ctx});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game'),{Weapon}=require('./src/Weapons');
let seed=91;Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
const g=new Game(canvas());g.resize(1000,620);g.startWithCharacter('tracer',[]);g._tutorialStep=-1;g.player.weapons=[];g.player.hp=g.player.maxHp=1e9;g.player.x=g.player.y=0;
g.enemies=Array.from({length:180},(_,i)=>{const e=g._createEnemy((i%15-7)*9,(Math.floor(i/15)-6)*9,'Skeleton');e.hp=e.maxHp=1e9;e.poisoned=3;e.poisonStacks=10;e.frozen=3;return e;});
g._gridFrame=999;g._buildEnemyGrid();let queries=0,reactions=0;const query=g._getNearbyEnemies.bind(g),reaction=g.synergy.processSynergy.bind(g.synergy);
g._getNearbyEnemies=(...args)=>{queries++;return query(...args);};g.synergy.processSynergy=(...args)=>{reactions++;return reaction(...args);};
const samples=[];let totalQueries=0,totalReactions=0;
for(let i=0;i<50;i++){
 g.bullets=[];
 for(const id of ['fusion_orbital_cannon','fusion_absolute_zero']){const w=new Weapon(g,id);g.player.weapons=[w];w.fire();}
 queries=0;reactions=0;const before=performance.now();g._checkCollisions(1/60);samples.push(performance.now()-before);totalQueries+=queries;totalReactions+=reactions;
}
samples.sort((a,b)=>a-b);
const result={method:'50 stationary collision samples: 180 durable poisoned/frozen targets, two real fusion casts before each sample, unchanged game collision path. Cast time excluded. This is a CPU fixture, not a normal run or hardware FPS guarantee.',source:flags.source||'current checkout',samples:samples.length,collisionQueries:totalQueries,synergyCallsFromVisuals:totalReactions,medianMs:samples[25],p95Ms:samples[47],visualOnlyFlags:g.bullets.map(b=>!!b.visualOnly)};
if(flags.out)writeFileSync(flags.out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
