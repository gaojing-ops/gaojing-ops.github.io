import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const layout=require('./src/ArtLayout');
const loaded=[];
function drawingContext(){const ops=[];return new Proxy({globalAlpha:1,ops},{get:(o,k)=>o[k]??((...args)=>{ops.push([k,...args]);}),set:(o,k,v)=>{o[k]=v;if(['fillStyle','strokeStyle'].includes(k))ops.push([k,v]);return true;}});}
globalThis.wx={createCanvas:()=>{const context=drawingContext();return {getContext:()=>context,context};},createImage:()=>({set src(value){loaded.push(value);this.onload?.();}})};
const Art=require('./src/Art');await Art.preload();
const calls=[];const ctx=new Proxy({globalAlpha:1,drawImage(...args){calls.push(args);}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});

test('archived atlases remain valid local PNGs with valid rectangles and sprite transparency',()=>{
 for(const [name,data] of Object.entries(layout)){
  const file=readFileSync(new URL('../games/emberfall/flux/art/'+name+'.png',import.meta.url));
  assert.equal(file.subarray(1,4).toString(),'PNG');assert.equal(file.readUInt32BE(16),data.width);assert.equal(file.readUInt32BE(20),data.height);
  if(name!=='terrain'){assert.ok([4,6].includes(file[25]));assert.deepEqual(data.alpha,[0,255]);}
  for(const [x,y,w,h] of data.rects){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=data.width&&y+h<=data.height);}
 }
});

test('all nine heroes, thirty-five monster types and ten bosses share the native art renderer',()=>{
 assert.equal(Art.HEROES.length,9);assert.equal(Art.MONSTERS.length,35);
 assert.deepEqual(Art.MONSTERS,Object.keys(require('./src/Enemy').TYPES));
 for(const id of Art.HEROES){assert.equal(Art.drawHero(ctx,id,0,0,15),true);assert.equal(calls.at(-1)[0].name,'heroes');assert.equal(Art.drawPortrait(ctx,id,0,0,68),true);}
 for(const type of Art.MONSTERS){assert.equal(Art.drawMonster(ctx,{type,x:0,y:0,radius:10,game:{time:1,player:{x:1}}}),true);assert.equal(calls.at(-1)[0].name,'monsters');}
 for(let i=0;i<10;i++){assert.equal(Art.drawBoss(ctx,{artIndex:i,x:0,y:0,radius:35,game:{time:1,player:{x:1}}}),true);assert.equal(calls.at(-1)[0].name,'bosses');}
});

test('the terrain atlas is archived rather than loaded by the active renderer',()=>{
 assert.equal(Art.drawMap,undefined);assert.deepEqual(loaded,[]);
 assert.ok(calls.every(call=>call[0].name!=='terrain'));
});

test('hero silhouettes and all enemy models are distinct and render without combat randomness',()=>{
 const random=Math.random;Math.random=()=>{throw Error('drawing consumed combat randomness');};
 try{
  const heroes=new Set(),monsters=new Set();
  for(const id of Art.HEROES){Art.drawPortrait(ctx,id,0,0,96);heroes.add(JSON.stringify(calls.at(-1)[0].context.ops));}
  for(const type of Art.MONSTERS){Art.drawMonster(ctx,{type,x:-50,y:0,radius:10,game:{time:2,player:{x:0}}});monsters.add(JSON.stringify(calls.at(-1)[0].context.ops));}
  assert.equal(heroes.size,9);assert.equal(monsters.size,35);
  for(const id of [...Art.HEROES,...Object.keys(require('./src/WeaponData').weapons),...Object.keys(require('./src/WeaponData').passives)])assert.ok(Art.drawIcon(ctx,id,0,0,64));
 }finally{Math.random=random;}
});

test('negative world positions cannot create unbounded animation-cache entries',()=>{
 for(let i=0;i<100;i++)Art.drawMonster(ctx,{type:'Bat',x:-250,y:0,radius:10,game:{time:i*.13,player:{x:0}}});
 assert.ok([...Art.cache.keys()].filter(key=>key.startsWith('monsters:Bat:')).length<=2);
});

test('projectiles, ground effects, companions and sentries preserve gameplay data',()=>{
 const actor={type:'dog',x:5,y:8,angle:1,timer:2,def:{radius:8},hp:30,maxHp:30,radius:8,speed:250};const before=JSON.stringify(actor);
 assert.doesNotThrow(()=>Art.drawCompanion(ctx,actor));assert.equal(JSON.stringify(actor),before);
 const sentry={x:1,y:2,hp:30,maxHp:60,lastTarget:{x:10,y:20},lastShootTime:1};const state=JSON.stringify(sentry);
 Art.drawSentry(ctx,sentry,1.05);assert.equal(JSON.stringify(sentry),state);
 for(const shape of ['bolt','rocket','sting','crescent','boomerang','cloud','flask','saw','singularity','crystal'])assert.doesNotThrow(()=>Art.drawProjectile(ctx,0,0,5,'#66ccff',shape,1,true));
 for(const color of ['#ff6600','#88ff00','#88ddff'])assert.doesNotThrow(()=>Art.drawArea(ctx,0,0,80,color,1));
});
