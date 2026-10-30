// One captured movement pointer leaves other fingers free for the dash button.
export function bindFloatingJoystick({surface,joystick,knob,isPlaying,onMove}) {
  let pointer=null,origin={x:0,y:0};
  const maxDistance=32,deadzone=5;
  function clear() {
    const captured=pointer;pointer=null;
    joystick.hidden=true;knob.style.transform='';
    if(captured!==null&&surface.hasPointerCapture(captured))surface.releasePointerCapture(captured);
    onMove(0,0);
  }
  function move(event) {
    if(event.pointerId!==pointer||!isPlaying())return;
    event.preventDefault();
    const dx=event.clientX-origin.x,dy=event.clientY-origin.y,distance=Math.hypot(dx,dy);
    const scale=distance>maxDistance?maxDistance/distance:1;
    knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
    if(distance<=deadzone)onMove(0,0);
    else onMove(dx*scale/maxDistance,dy*scale/maxDistance);
  }
  function down(event) {
    if(!isPlaying()||pointer!==null||event.button!==0)return;
    if(event.target.closest('button,a,input,select,textarea,[role="button"],.stage-overlay,dialog'))return;
    event.preventDefault();
    const rect=surface.getBoundingClientRect();
    origin={x:event.clientX,y:event.clientY};pointer=event.pointerId;
    joystick.style.left=`${origin.x-rect.left}px`;joystick.style.top=`${origin.y-rect.top}px`;
    joystick.hidden=false;
    surface.setPointerCapture(pointer);move(event);
  }
  function end(event) {if(event.pointerId===pointer)clear();}
  surface.addEventListener('pointerdown',down);
  surface.addEventListener('pointermove',move);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,end);
  return {clear};
}
