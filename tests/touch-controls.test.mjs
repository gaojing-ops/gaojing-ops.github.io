import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFloatingJoystick} from '../games/emberfall/touch-controls.js';

function fixture() {
 const handlers=new Map(),captures=new Set(),moves=[];
 const surface={addEventListener:(name,fn)=>handlers.set(name,fn),getBoundingClientRect:()=>({left:10,top:50}),
  hasPointerCapture:id=>captures.has(id),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>{captures.delete(id);emit('lostpointercapture',{pointerId:id});}};
 const joystick={hidden:true,style:{}},knob={style:{}};
 let playing=true;
 const control=bindFloatingJoystick({surface,joystick,knob,isPlaying:()=>playing,onMove:(x,y)=>moves.push([x,y])});
 function emit(name,options={}){const event={pointerId:1,button:0,clientX:150,clientY:200,target:{closest:()=>null},preventDefault(){this.prevented=true;},...options};handlers.get(name)(event);return event;}
 return {emit,control,joystick,knob,moves,captures,pause:()=>{playing=false;control.clear();}};
}

test('floating joystick starts under each new touch without moving the player',()=>{
 const f=fixture();f.emit('pointerdown');assert.equal(f.joystick.style.left,'140px');assert.equal(f.joystick.style.top,'150px');assert.equal(f.joystick.hidden,false);assert.deepEqual(f.moves.at(-1),[0,0]);
 f.emit('pointerup');assert.equal(f.joystick.hidden,true);assert.equal(f.captures.size,0);
 f.emit('pointerdown',{clientX:300,clientY:400});assert.equal(f.joystick.style.left,'290px');assert.equal(f.joystick.style.top,'350px');assert.deepEqual(f.moves.at(-1),[0,0]);
});
test('drag deadzone and diagonal clamping preserve direction and cap speed',()=>{
 const f=fixture();f.emit('pointerdown');f.emit('pointermove',{clientX:153,clientY:204});assert.deepEqual(f.moves.at(-1),[0,0]);
 f.emit('pointermove',{clientX:246,clientY:328});const [x,y]=f.moves.at(-1);assert.ok(Math.abs(Math.hypot(x,y)-1)<1e-10);assert.ok(Math.abs(x-.6)<1e-10);assert.ok(Math.abs(y-.8)<1e-10);
});
test('a second finger does not steal or stop the active movement pointer',()=>{
 const f=fixture();f.emit('pointerdown');f.emit('pointermove',{clientX:182});assert.deepEqual(f.moves.at(-1),[1,0]);
 f.emit('pointerdown',{pointerId:2,clientX:400});f.emit('pointermove',{pointerId:2,clientX:400});f.emit('pointerup',{pointerId:2});
 assert.deepEqual(f.moves.at(-1),[1,0]);assert.equal(f.joystick.style.left,'140px');assert.equal(f.joystick.hidden,false);
 f.emit('pointerup');assert.deepEqual(f.moves.at(-1),[0,0]);assert.equal(f.joystick.hidden,true);
});
test('buttons and overlays keep their input; only a primary pointer starts movement',()=>{
 const f=fixture();assert.equal(f.emit('pointerdown',{target:{closest:()=>({})}}).prevented,undefined);
 f.emit('pointerdown',{button:2});assert.equal(f.captures.size,0);assert.equal(f.joystick.hidden,true);
 f.pause();f.emit('pointerdown');assert.equal(f.captures.size,0);
});
for(const end of ['pointercancel','lostpointercapture'])test(`${end} clears movement and allows a fresh touch`,()=>{
 const f=fixture();f.emit('pointerdown');f.emit('pointermove',{clientY:240});f.emit(end);assert.equal(f.joystick.hidden,true);assert.deepEqual(f.moves.at(-1),[0,0]);assert.equal(f.captures.size,0);f.emit('pointerdown',{pointerId:3});assert.ok(f.captures.has(3));
});
test('pause or resize cleanup releases capture and ignores stale moves',()=>{
 const f=fixture();f.emit('pointerdown');f.emit('pointermove',{clientX:182});f.control.clear();f.emit('pointermove',{clientX:190});assert.deepEqual(f.moves.at(-1),[0,0]);assert.equal(f.knob.style.transform,'');assert.equal(f.captures.size,0);
});
