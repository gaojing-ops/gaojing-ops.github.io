import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const layout=require('./src/ArtLayout');
globalThis.wx={createImage:()=>({set src(value){const name=value.split('/').at(-1).replace('.png','');this.width=layout[name].width;this.height=layout[name].height;this.name=name;this.onload();}})};
const Art=require('./src/Art');await Art.preload();
const calls=[];const ctx=new Proxy({globalAlpha:1,drawImage(...args){calls.push(args);}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});

test('all generated atlases are local PNGs with valid rectangles and sprite transparency',()=>{
 for(const [name,data] of Object.entries(layout)){
  const file=readFileSync(new URL('../games/emberfall/flux/art/'+name+'.png',import.meta.url));
  assert.equal(file.subarray(1,4).toString(),'PNG');assert.equal(file.readUInt32BE(16),data.width);assert.equal(file.readUInt32BE(20),data.height);
  if(name!=='terrain'){assert.ok([4,6].includes(file[25]));assert.deepEqual(data.alpha,[0,255]);}
  for(const [x,y,w,h] of data.rects){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=data.width&&y+h<=data.height);}
 }
});

test('all nine heroes, thirty-five monster types and ten bosses use the new atlases',()=>{
 assert.equal(Art.HEROES.length,9);assert.equal(Art.MONSTERS.length,35);
 assert.deepEqual(Art.MONSTERS,Object.keys(require('./src/Enemy').TYPES));
 for(const id of Art.HEROES){assert.equal(Art.drawHero(ctx,id,0,0,15),true);assert.equal(calls.at(-1)[0].name,'heroes');assert.equal(Art.drawPortrait(ctx,id,0,0,68),true);}
 for(const type of Art.MONSTERS){assert.equal(Art.drawMonster(ctx,{type,x:0,y:0,radius:10,game:{time:1,player:{x:1}}}),true);assert.equal(calls.at(-1)[0].name,'monsters');}
 for(let i=0;i<10;i++){assert.equal(Art.drawBoss(ctx,{artIndex:i,x:0,y:0,radius:35,game:{time:1,player:{x:1}}}),true);assert.equal(calls.at(-1)[0].name,'bosses');}
});

test('five chapter maps draw different terrain cells with mirrored repeating tiles',()=>{
 assert.deepEqual(Object.values(Art.MAPS),[0,1,2,3,4]);
 const seen=new Set();
 for(const style of Object.keys(Art.MAPS)){
  calls.length=0;assert.equal(Art.drawMap(ctx,style,-25,90,390,844),true);assert.ok(calls.length>=2);
  const [,x,y,w,h]=calls[0];seen.add([x,y,w,h].join(','));assert.equal(calls[0][0].name,'terrain');
 }
 assert.equal(seen.size,5);
});
