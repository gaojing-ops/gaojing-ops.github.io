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
