import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const {WorldScenery,PALETTES,CACHE_LIMIT}=require('./src/WorldScenery');
function context(){
 const calls=[],stack=[];
 const ctx=new Proxy({calls,globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},drawImage(...args){calls.push(args);},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 return ctx;
}
globalThis.wx={createCanvas:()=>({getContext:()=>context()})};
const geometry=scene=>scene.props.map(({x,y,s,v,type})=>({x,y,s,v,type}));

test('the original courtyard has four independent braziers and stable tree, rock and pillar positions',()=>{
 const a=new WorldScenery(),b=new WorldScenery();a.ensureCourtyard();b.ensureCourtyard();
 assert.deepEqual(geometry(a),geometry(b));
 assert.deepEqual(a.props.filter(o=>o.type==='brazier').map(o=>[o.x,o.y]),[[-190,-135],[190,-135],[-190,135],[190,135]]);
 assert.deepEqual(new Set(a.props.map(o=>o.type)),new Set(['tree','rock','pillar','brazier']));
 assert.equal(a.ground.width,2400);assert.equal(a.ground.height,1800);
});

test('ground and scenery remain anchored to the world while the camera moves',()=>{
 const scene=new WorldScenery(),ctx=context();scene.drawGround(ctx,-500,-300,1000,600,.016);
 const original=geometry(scene),first=ctx.calls.find(call=>call[0]===scene.ground);
 ctx.calls.length=0;scene.drawGround(ctx,-460,-280,1000,600,.016);
 const second=ctx.calls.find(call=>call[0]===scene.ground);
 assert.equal(second[1]-first[1],-40);assert.equal(second[2]-first[2],-20);
 assert.deepEqual(geometry(scene),original);
 const visible=scene.visibleProps(-500,-300,1000,600,{x:0,y:0});
 assert.ok(visible.every(o=>o.x>-565&&o.x<565&&o.y>-320&&o.y<450));
});

test('unlimited forest chunks are distinct, reproducible after eviction, and bounded in memory',()=>{
 const scene=new WorldScenery();const first=scene.chunk(10,10).props.map(({x,y,type,s})=>({x,y,type,s}));
 assert.notDeepEqual(scene.chunk(11,10).props.map(({x,y,type,s})=>({x,y,type,s})),first);
 for(let i=0;i<50;i++)scene.chunk(20+i,20+i);
 assert.equal(scene.chunks.size,CACHE_LIMIT);
 assert.deepEqual(scene.chunk(10,10).props.map(({x,y,type,s})=>({x,y,type,s})),first);
});

test('chapter palettes retain geometry and scenery never consumes combat randomness',()=>{
 const scene=new WorldScenery(),ctx=context(),random=Math.random;Math.random=()=>{throw Error('combat RNG consumed');};
 try{
  let baseline;
  for(const style of Object.keys(PALETTES)){
   scene.setStyle(style);scene.drawGround(ctx,2000,2000,1000,600,.016);
   if(baseline)assert.deepEqual(geometry(scene),baseline);else baseline=geometry(scene);
   assert.equal(scene.palette,PALETTES[style]);
  }
 }finally{Math.random=random;}
});

test('foreground trees fade around the player and restore drawing opacity',()=>{
 const scene=new WorldScenery(),ctx=context(),alphas=[];ctx.fill=()=>alphas.push(ctx.globalAlpha);
 scene.player={x:0,y:-30};scene.drawProp(ctx,{x:0,y:0,s:1,type:'tree'});
 assert.ok(alphas.every(a=>a===.35));assert.equal(ctx.globalAlpha,1);
 alphas.length=0;scene.player={x:100,y:100};scene.drawProp(ctx,{x:0,y:0,s:1,type:'tree'});
 assert.ok(alphas.every(a=>a===1));
});
