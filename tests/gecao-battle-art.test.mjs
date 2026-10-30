import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
function context(){const ops=[],stack=[],state={globalAlpha:1};return new Proxy({ops,save(){stack.push({...state});},restore(){Object.assign(state,stack.pop()||{});}}, {get:(o,k)=>k in o?o[k]:k in state?state[k]:(...args)=>ops.push([k,...args]),set:(o,k,v)=>(state[k]=v,true)});}
globalThis.wx={createCanvas:()=>({getContext:()=>context()}),createImage:()=>({})};
const Art=require('./src/Art'),Boss=require('./src/Boss'),{Enemy}=require('./src/Enemy');
const game=()=>({time:2,qualityLevel:1,width:1000,height:620,camera:{x:-300,y:-100},player:{x:0,y:0},meta:{data:{selectedAura:'void_phantom'}}});
const boss=()=>({game:game(),artIndex:0,x:20,y:40,radius:36,name:'熔心破坏者',hp:1200,maxHp:2000,phase:2,shield:30,flashTimer:0});
test('frost, shadow, poison and fire particles keep distinct muted elemental pigments',()=>{
 assert.deepEqual(Art.pigment('#66ccff'),Art.pigment('#88ddff'));
 assert.notDeepEqual(Art.pigment('#66ccff'),Art.pigment('#8800ff'));
 assert.equal(new Set(['#66ccff','#8800ff','#88ff00','#ff6600'].map(color=>Art.pigment(color).main)).size,4);
});
test('all warning forms retain their source circle, corridor, cone and world-space dimensions',()=>{
 const b=boss(),c=context();
 const cases=[{type:'circle',x:25,y:-30,radius:130,timer:1},{type:'line',x:10,y:20,angle:1,width:40,length:400,timer:1},{type:'cone',x:20,y:30,angle:.3,width:Math.PI/3,length:300,timer:1},{type:'multi_line',x:10,y:20,angles:[0,1,2],width:30,length:350,timer:1},{type:'multi_circle',targets:[{x:11,y:22},{x:33,y:44}],radius:80,timer:1},{type:'fullscreen',timer:1},{type:'none',timer:.3}];
 for(const t of cases){b.telegraph=t;const before=JSON.stringify(b);Art.drawTelegraph(c,b);assert.equal(JSON.stringify(b),before);}
 assert.ok(c.ops.some(op=>op[0]==='arc'&&op[1]===25&&op[2]===-30&&op[3]===130));
 assert.ok(c.ops.some(op=>op[0]==='lineTo'&&op[1]===400&&op[2]===-20));
 assert.ok(c.ops.some(op=>op[0]==='arc'&&op[3]===300&&op[4]===-Math.PI/6&&op[5]===Math.PI/6));
 assert.ok(c.ops.some(op=>op[0]==='fillRect'&&op.slice(1).join(',')==='-300,-100,1000,620'));
});
test('sustained beam sectors and shockwave edges match the unchanged collision geometry',()=>{
 const b=boss(),c=context();
 for(const eff of [{type:'laserSweep',angle:1,timer:2},{type:'deathRay',angle:2,timer:2},{type:'shockwave',radius:180,timer:.4},{type:'deathMark',targetX:11,targetY:22,timer:1},{type:'bloodPool',x:30,y:40,radius:90,timer:2},{type:'voidRift',x:-30,y:40,radius:110,timer:2}]){b._sustainedEffect=eff;const before=JSON.stringify(b);Art.drawBossGround(c,b);assert.equal(JSON.stringify(b),before);}
 assert.ok(c.ops.some(op=>op[0]==='arc'&&op[3]===390&&op[4]===-.13&&op[5]===.13));
 assert.ok(c.ops.some(op=>op[0]==='arc'&&op[3]===1200&&op[4]===-.22&&op[5]===.22));
 assert.ok(c.ops.some(op=>op[0]==='arc'&&op[3]===222));assert.ok(c.ops.some(op=>op[0]==='arc'&&op[3]===138));
});
test('full native enemy and boss paths bypass legacy sprite builders without consuming combat RNG',()=>{
 const c=context(),random=Math.random;Math.random=()=>{throw Error('render consumed combat randomness');};
 try{
  for(const type of Art.MONSTERS){const e=Object.assign(Object.create(Enemy.prototype),{type,x:30,y:40,radius:12,game:game(),hp:10,maxHp:20,frozen:1,poisoned:1,isElite:true,shield:10,invincibleTimer:1,_affixColors:['#ff8800','#66ccff'],regeneratingAffix:true,isInvisible:type==='Phantom',_draw(){throw Error('legacy sprite builder');}});const before=JSON.stringify(e);e.draw(c);assert.equal(JSON.stringify(e),before);}
  for(let i=0;i<10;i++){const b=Object.assign(Object.create(Boss.prototype),boss(),{artIndex:i,_drawTelegraph(){throw Error('legacy telegraph');},_drawHealthBar(){throw Error('legacy bar');},_drawSustainedEffect(){throw Error('legacy effect');}});const before=JSON.stringify(b);b.draw(c);assert.equal(JSON.stringify(b),before);}
 }finally{Math.random=random;}
 assert.equal(c.globalAlpha,1);
});
test('hostile bullets, mortar warnings, player trails and auras preserve all actor state',()=>{
 const c=context(),bullets=[{x:10,y:20,radius:5,vx:100,vy:0},{x:-40,y:30,radius:18,vx:2,vy:4}],warnings=[{active:true,x:20,y:40,radius:80,timer:.6}],p={game:game(),characterId:'tracer',x:10,y:20,radius:14,facingAngle:1,isMoving:true,dashActiveTimer:.1,trail:[{x:1,y:2,a:.4,angle:1}],_history:[{x:1,y:2}],pets:[]};
 const before=JSON.stringify([bullets,warnings,p]),random=Math.random;Math.random=()=>{throw Error('draw consumed RNG');};
 try{Art.drawHostileProjectiles(c,bullets,'#88ff00');Art.drawMortarWarnings(c,warnings,2);for(const aura of ['arcane_circle','crimson_aegis','aurora_trail','void_phantom','crown_of_kings']){const copy={...p,game:{...p.game,meta:{data:{selectedAura:aura}}}};Art.drawPlayerActor(c,copy);}}finally{Math.random=random;}
 assert.equal(JSON.stringify([bullets,warnings,p]),before);assert.equal(c.globalAlpha,1);
 assert.ok(c.ops.some(op=>op[0]==='moveTo'&&op[1]===-40&&op[2]===12),'hostile projectile keeps its full radius');
});
