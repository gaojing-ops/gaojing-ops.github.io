import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const V=require('./src/SpellVfx'),Particles=require('./src/ParticleSystem');
function recorder(){
 const calls=[],stack=[],state={globalAlpha:1,lineWidth:1,lineCap:'butt',lineJoin:'miter',strokeStyle:'#000',fillStyle:'#000'};
 const c=new Proxy({save(){stack.push({...state});},restore(){Object.assign(state,stack.pop());}}, {get:(o,k)=>k in state?state[k]:o[k]??((...args)=>calls.push([k,...args,state.globalAlpha,state.lineWidth])),set:(o,k,v)=>(state[k]=v,true)});
 return {c,calls,state};
}
const game=()=>({qualityLevel:1,time:3,player:{x:0,y:0,facingAngle:.3,trail:[{x:-10,y:0}],turrets:[{active:true,x:70,y:10},{active:true,x:-70,y:10}]}});
test('all eight invocations have distinct animated geometry without combat mutation or RNG',()=>{
 const signatures=new Set(),g=game(),random=Math.random;Math.random=()=>{throw Error('visual RNG');};
 try{for(const deity of Object.keys(V.THEMES)){
  const fx={kind:'vow',deity,x:0,y:0,age:.2,life:1.2,radius:150,points:[{x:100,y:40}]},before=JSON.stringify([g,fx]);
  const a=recorder();V.drawInvocation(a.c,fx,g);assert.equal(JSON.stringify([g,fx]),before);assert.equal(a.state.globalAlpha,1);assert.equal(a.state.lineWidth,1);
  // Strip colors; distinct shape families must differ beyond their palette.
  signatures.add(JSON.stringify(a.calls.map(row=>row.filter(v=>typeof v!=='string'||!v.startsWith('#')))));
  fx.age=.65;const b=recorder();V.drawInvocation(b.c,fx,g);assert.notDeepEqual(a.calls,b.calls);
 }}finally{Math.random=random;}
 assert.equal(signatures.size,8);
});
test('nine skill families preserve snapshots and lower quality reduces detail work',()=>{
 for(const [kind,deity] of Object.entries({tracer:'ember',walker:'forge',gunner:'wind',cryomancer:'moon',biohazard:'grove',berserker:'ember',arcane:'night',engineer:'forge',assassin:'night'})){
  const g=game(),fx={kind,deity,x:0,y:0,from:{x:-100,y:0},age:.25,life:1,radius:200,points:Array.from({length:48},(_,i)=>({x:i*10,y:40}))},before=JSON.stringify([g,fx]);
  const hi=recorder();V.drawInvocation(hi.c,fx,g);assert.equal(JSON.stringify([g,fx]),before);
  g.qualityLevel=0;const lo=recorder();V.drawInvocation(lo.c,fx,g);assert.ok(lo.calls.length<hi.calls.length,kind);assert.ok(hi.calls.length<1400,kind+' bounded work');
 }
});
test('hit feedback is bounded, expires on update and draw does not advance it',()=>{
 const p=new Particles();for(let i=0;i<100;i++)p._feedback(i*20,0,'#88ff00','grove');assert.equal(p.feedback.length,24);
 const before=JSON.stringify(p.feedback),random=Math.random;Math.random=()=>{throw Error('draw RNG');};
 try{const hi=recorder(),lo=recorder();p.draw(hi.c,true);p.draw(lo.c,false);assert.ok(lo.calls.length<hi.calls.length,'low detail draws fewer hit echoes');}finally{Math.random=random;}
 assert.equal(JSON.stringify(p.feedback),before);p.update(.3);assert.equal(p.feedback.length,0);
 p._feedback(0,0,'#88ff00','hit');p._feedback(1,1,'#88ff00','hit');assert.equal(p.feedback.length,1,'same impact does not stack into a flash wall');
});
test('cosmetic hit feedback keeps the original particle RNG consumption',()=>{
 let count=0;const random=Math.random;Math.random=()=>{count++;return .5;};
 try{for(const [method,n] of [['hitSpark',1],['freezeHit',3],['poisonHit',3],['evolvedHit',4]]){
  count=0;const p=new Particles();p[method](0,0,'#ffcc00');assert.equal(count,n*2,method);assert.equal(p.particles.length,n);
 }}finally{Math.random=random;}
});
test('simultaneous skills and divine pulses share one presentation budget',()=>{
 const {drawNightMagic}=require('./src/NightMagic'),original=V.drawInvocation;let count=0;
 V.drawInvocation=()=>count++;
 try{for(const [quality,expected] of [[1,8],[0,4]]){
  count=0;drawNightMagic(recorder().c,{qualityLevel:quality,skillSystem:{visualEffects:Array(12).fill({})},pantheon:{effects:Array(20).fill({})}});assert.equal(count,expected);
 }}finally{V.drawInvocation=original;}
});
test('low-detail chain lightning does not retain high-detail impact bloom',()=>{
 const previous=globalThis.wx;
 globalThis.wx={createCanvas:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  const fx={kind:'storm',deity:'storm',x:0,y:0,age:.2,life:.7,radius:150,points:[{x:90,y:40},{x:130,y:70}]};
  const hi=recorder(),lo=recorder();V.drawInvocation(hi.c,fx,game());V.drawInvocation(lo.c,fx,{...game(),qualityLevel:0});
  assert.ok(hi.calls.some(c=>c[0]==='drawImage'),'high detail has local bloom');
  assert.equal(lo.calls.filter(c=>c[0]==='drawImage').length,0,'low detail disables every storm bloom, including target impacts');
  assert.ok(lo.calls.some(c=>c[0]==='lineTo'),'lightning geometry remains visible');
 }finally{if(previous===undefined)delete globalThis.wx;else globalThis.wx=previous;}
});
test('swarm companions pass the current quality and animation phase to their projectile art',()=>{
 const F=require('./src/FacetedArt'),W=require('./src/WeaponArt'),original=F.drawProjectile,calls=[];
 F.drawProjectile=(...args)=>calls.push(args);
 try{
  const g={...game(),width:1000,height:620,camera:{x:-300,y:-100},qualityLevel:0},w={game:g,_clones:[],_orbList:[],_nanoSwarm:[{x:30,y:40,hitRadius:15,angle:.3}]};
  W.drawWeaponAir(recorder().c,w);assert.equal(calls.length,1);assert.equal(calls[0][9],false,'low detail reaches the swarm draw call');
  assert.equal(calls[0][8],g.time*3,'phase follows existing game time');
  calls.length=0;g.qualityLevel=1;W.drawWeaponAir(recorder().c,w);assert.equal(calls[0][9],true);
 }finally{F.drawProjectile=original;}
});
test('projectile ornament budgets stay bounded across dense bursts and reserve fusion details',()=>{
 const {c,calls}=recorder();V.beginFrame(c,true);
 for(let i=0;i<48;i++)V.drawProjectileDetail(c,8,'#aaccdd','bolt',.3,true);
 const before=calls.length;
 for(let i=0;i<500;i++)V.drawProjectileDetail(c,8,'#aaccdd','bolt',.3,true);
 assert.equal(calls.length,before,'burst length cannot expand the ornament budget');
 V.drawProjectileDetail(c,100,'#aaccdd','orbital_beam',.3,true);assert.ok(calls.length>before,'fusion column has reserved capacity');
 V.beginFrame(c,true);const next=calls.length;V.drawProjectileDetail(c,8,'#aaccdd','bolt',.4,true);assert.ok(calls.length>next,'new frame renews detail');
 V.beginFrame(c,false);const low=calls.length;V.drawProjectileDetail(c,8,'#aaccdd','bolt',.4,true);V.drawProjectileDetail(c,100,'#aaccdd','orbital_beam',.4,true);assert.equal(calls.length,low);
});
test('friendly opacity protects the watcher smoothly without modifying projectile geometry or hostile state',()=>{
 const p={x:100,y:100,radius:14},near={x:100,y:82,radius:20,shape:'crescent'},far={x:400,y:300,radius:20};
 const before=JSON.stringify([p,near,far]);assert.equal(V.friendlyProjectileAlpha(near,p),.32);assert.equal(V.friendlyProjectileAlpha(far,p),1);
 const values=[0,35,55,70,100].map(dx=>V.friendlyProjectileAlpha({...near,x:near.x+dx},p));
 assert.ok(values.every((v,i)=>v>=.32&&v<=1&&(!i||v>=values[i-1])));assert.ok(values.some(v=>v>.32&&v<1),'transition has a fade, not a hard visibility jump');
 assert.equal(JSON.stringify([p,near,far]),before);
});
test('fractional combat ticks and large critical numbers use compact drawing labels',()=>{
 const {drawDamageNumber}=require('./src/Renderer');
 for(const [input,label] of [[.019333333333,'<0.1'],['+0.333333333','+0.3'],[12.0000000001,'12'],[1234567,'123.5万'],[123456789,'1.2亿'],['破绽!','破绽!']]){
  const {c,calls}=recorder();drawDamageNumber(c,0,0,input,1,'#fff');
  assert.equal(calls.find(row=>row[0]==='fillText')[1],label);assert.equal(calls.find(row=>row[0]==='strokeText')[1],label);
 }
});
test('the live render pipeline fades friendly shots and restores full opacity for danger shots',()=>{
 const Art=require('./src/Art'),install=require('./src/RenderSystem');class Game{}install(Game);
 const {c}=recorder(),seen=[],errors=[],noop=()=>{},p={x:0,y:100,radius:14,weapons:[],turrets:[],draw:noop},g=Object.assign(new Game(),{
  ctx:c,width:1100,height:650,camera:{x:-100,y:-100},player:p,time:900,qualityLevel:1,_tutorialStep:-1,frameDt:1/60,
  mapManager:{draw:noop,visibleProps:()=>[]},stageSystem:{draw:noop},eventSystem:{drawWorld:noop,draw:noop},eventEnhancer:{draw:noop},achievements:{draw:noop},particles:{draw:noop},input:{active:false},
  enemies:[],bosses:[],gems:[],pickups:[],mortarWarnings:[],damageNumbers:[],enemyBullets:[{active:true,x:10,y:80,color:'#ff5555'}],
  bullets:[{x:0,y:82,radius:20,draw:ctx=>seen.push(['near',ctx.globalAlpha])},{x:400,y:82,radius:20,draw:ctx=>seen.push(['far',ctx.globalAlpha])}]
 });
 for(const method of ['_drawComboDisplay','_drawBossEntrance','_drawHUD','_drawBountyIndicator','_drawPauseButton','_drawLastStand'])g[method]=noop;
 const old={hero:Art.drawHero,focus:Art.drawPlayerFocus,shots:Art.drawHostileProjectiles,magic:Art.drawNightMagic,error:console.error};
 Art.drawHero=ctx=>seen.push(['hero',ctx.globalAlpha]);Art.drawPlayerFocus=noop;Art.drawNightMagic=noop;Art.drawHostileProjectiles=ctx=>seen.push(['hostile',ctx.globalAlpha]);console.error=(...args)=>errors.push(args.map(String).join(' '));
 const before=JSON.stringify(g.enemyBullets);
 try{g.draw();assert.deepEqual(errors,[]);assert.deepEqual(seen,[['near',.32],['far',1],['hero',1],['hostile',1]]);assert.equal(c.globalAlpha,1);assert.equal(JSON.stringify(g.enemyBullets),before);}
 finally{Art.drawHero=old.hero;Art.drawPlayerFocus=old.focus;Art.drawHostileProjectiles=old.shots;Art.drawNightMagic=old.magic;console.error=old.error;}
});
test('repeated static loot uses one bounded cached model and preserves per-instance opacity',()=>{
 const F=require('./src/FacetedArt'),previous=globalThis.wx,key='pickup:chest',oldSprite=F.cache.get(key);F.cache.delete(key);
 let canvases=0;const off=recorder(),target=recorder();globalThis.wx={createCanvas:()=>{canvases++;return{getContext:()=>off.c};}};
 try{
  F.drawPickup(target.c,10,20,'chest',.4);const commands=off.calls.length;
  for(let i=0;i<200;i++)F.drawPickup(target.c,i,20,'chest',.6);
  assert.equal(canvases,1);assert.equal(off.calls.length,commands,'duplicate drops do not rebuild vector models');
  const images=target.calls.filter(c=>c[0]==='drawImage');assert.equal(images.length,201);assert.equal(images[0][6],.4);assert.equal(images[1][6],.6);assert.equal(target.c.globalAlpha,1);
  for(let i=0;i<20;i++)F.drawPickup(target.c,0,0,'unknown-'+i);assert.equal(canvases,2,'unknown IDs share one fallback instead of growing the cache');
 }finally{if(previous===undefined)delete globalThis.wx;else globalThis.wx=previous;F.cache.delete(key);F.cache.delete('pickup:default');if(oldSprite)F.cache.set(key,oldSprite);}
});
