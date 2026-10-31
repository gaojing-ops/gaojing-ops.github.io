// Deterministic carved sigils and spell animation. No combat RNG or state writes.
const F=require('./FacetedArt');
const {DEITIES}=require('./Pantheon');
const TAU=Math.PI*2;
const SKILL_ART={
 tracer:{deity:'ember',symbol:'lantern',life:1.5,radius:48,follow:true},
 walker:{deity:'forge',symbol:'shield',life:5,radius:43,follow:true},
 gunner:{deity:'wind',symbol:'arrow',life:6,radius:55,follow:true},
 cryomancer:{deity:'moon',symbol:'snow',life:1.1},
 biohazard:{deity:'grove',symbol:'thorn',life:1.1},
 berserker:{deity:'ember',symbol:'axe',life:8,radius:60,follow:true},
 arcane:{deity:'night',symbol:'moon',life:6,radius:58,follow:true},
 engineer:{deity:'forge',symbol:'hammer',life:1.5,radius:72},
 assassin:{deity:'night',symbol:'dagger',life:.8},
};
function path(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function line(c,points,color,width=2){c.beginPath();c.strokeStyle=color;c.lineWidth=width;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function gem(c,x,y,r,color){path(c,[[x,y-r],[x+r*.6,y],[x,y+r],[x-r*.6,y]],color);}
function sigil(c,id,x,y,size){
 const deity=id.startsWith('god_')?id.slice(4):SKILL_ART[id.slice(6)]?.deity;
 const d=DEITIES[deity];if(!d)return false;
 const symbol=id.startsWith('god_')?d.icon:SKILL_ART[id.slice(6)].symbol;
 c.save();c.translate(x+size/2,y+size/2);c.scale(size/80,size/80);c.lineWidth=1.5;
 const points=[];for(let i=0;i<8;i++)points.push([Math.cos(i*TAU/8)*35,Math.sin(i*TAU/8)*35]);path(c,points,'#12291f',d.color);
 F.drawIcon(c,symbol,-28,-28,56);
 if(id.startsWith('god_')){gem(c,0,-33,5,d.color);gem(c,0,33,4,d.color);}
 else{line(c,[[-25,28],[0,33],[25,28]],d.color,2.5);for(const v of [-1,1])gem(c,v*29,-19,3,d.color);}
 c.restore();return true;
}
function drawIcon(c,id,x,y,size){if(!sigil(c,id,x,y,size))return F.drawIcon(c,id,x,y,size);return id;}
function makeSkillEffect(game,from){
 const p=game.player,id=p.characterId,s=SKILL_ART[id];if(!s)return null;
 let radius=s.radius||60;
 if(id==='cryomancer')radius=Math.max(540,Math.hypot(game.width||800,game.height||600)*.58)*p.area;
 if(id==='biohazard')radius=Math.min(440*p.area,640);
 if(id==='assassin')radius=165*p.area;
 const points=['cryomancer','biohazard'].includes(id)?(game.enemies||[]).filter(e=>e.active&&Math.hypot(e.x-p.x,e.y-p.y)<=radius).slice(0,48).map(e=>({x:e.x,y:e.y})):[];
 return {kind:id,deity:s.deity,x:p.x,y:p.y,from,age:0,life:s.life,radius,follow:!!s.follow,points};
}
function ring(c,x,y,r,color,alpha=1){c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=2;const points=[];for(let i=0;i<12;i++)points.push([x+Math.cos(i*TAU/12)*r,y+Math.sin(i*TAU/12)*r]);path(c,points,null,color);c.restore();}
function drawSpell(c,fx,game){
 const p=game.player,x=fx.follow?p.x:fx.x,y=fx.follow?p.y:fx.y;
 const color=DEITIES[fx.deity]?.color||'#efd18e',t=fx.age,q=Math.min(1,t/fx.life),fade=Math.min(1,(fx.life-t)*4),kind=fx.kind,r=fx.radius;
 c.save();c.globalAlpha*=fade;
 if(kind==='storm'){
  let prev={x,y};for(const point of fx.points||[]){const dx=point.x-prev.x,dy=point.y-prev.y;line(c,[[prev.x,prev.y],[prev.x+dx*.32-dy*.08,prev.y+dy*.32+dx*.08],[prev.x+dx*.63+dy*.07,prev.y+dy*.63-dx*.07],[point.x,point.y]],color,3);gem(c,point.x,point.y,8,color);prev=point;}
 }else if(kind==='assassin'){
  if(fx.from)line(c,[[fx.from.x,fx.from.y],[x,y]],color,2);
  for(const a of [-.6,.6]){c.save();c.translate(x,y);c.rotate(a);path(c,[[-r*.8,-5],[r*.85,-12],[r*.55,5],[-r*.7,8]],color);c.restore();}ring(c,x,y,r*(.3+q*.7),color,.5);
 }else if(kind==='engineer'){
  const pts=(p.turrets||[]).filter(o=>o.active).map(o=>[o.x,o.y]);if(pts.length>1)line(c,[...pts,pts[0]],color,2);
  for(const [tx,ty] of pts){ring(c,tx,ty,24+q*15,color,.6);gem(c,tx,ty-45-q*10,6,color);}
 }else if(kind==='walker'){
  ring(c,x,y-9,r,color,.7);for(let i=0;i<5;i++){const a=i*TAU/5+t*.35,tx=x+Math.cos(a)*r,ty=y-9+Math.sin(a)*r*.7;drawIcon(c,'skill_walker',tx-9,ty-9,18);}
 }else if(kind==='gunner'){
  const a=p.facingAngle||0;for(let i=0;i<3;i++){const dist=r+16+i*20;const tx=x+Math.cos(a)*dist,ty=y+Math.sin(a)*dist;line(c,[[tx+Math.cos(a+2.5)*9,ty+Math.sin(a+2.5)*9],[tx,ty],[tx+Math.cos(a-2.5)*9,ty+Math.sin(a-2.5)*9]],color,2);}
  ring(c,x,y,r*.6,color,.35);
 }else if(kind==='arcane'){
  const points=[];for(let i=0;i<5;i++){const a=i*TAU/5+t*.35,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7;points.push([px,py]);gem(c,px,py,6,color);}line(c,[points[0],points[2],points[4],points[1],points[3],points[0]],color,1.4);
 }else if(kind==='berserker'){
  for(let i=0;i<2;i++){const a=t*3+i*Math.PI;c.save();c.translate(x,y);c.rotate(a);path(c,[[r*.4,-r*.65],[r,-r*.25],[r*.85,r*.55],[r*.65,0]],color);c.restore();}
  ring(c,x,y,r*.65,color,.3);
 }else if(kind==='tracer'){
  for(let i=0;i<6;i++){const a=i*TAU/6-t*2;gem(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.65,4+i%2*2,color);}ring(c,x,y,r*.6,color,.5);
 }else{
  const radius=r*Math.min(1,q*2+.15);ring(c,x,y,radius,color,.7);ring(c,x,y,radius*.85,color,.3);
  // A readable casting seal stays near the hero even when a viewport-sized
  // wave has already expanded beyond the screen. Impact shards mark real targets.
  if(['cryomancer','biohazard','moon'].includes(kind)){
   const inner=Math.min(72,r*.45);ring(c,x,y,inner,color,.8);
   for(let i=0;i<6;i++){const a=i*TAU/6+t*.25,tx=x+Math.cos(a)*inner,ty=y+Math.sin(a)*inner;
    line(c,[[x+Math.cos(a)*(inner-13),y+Math.sin(a)*(inner-13)],[tx,ty],[x+Math.cos(a)*(inner+9),y+Math.sin(a)*(inner+9)]],color,2.5);gem(c,tx,ty,5,color);
   }
   for(const target of fx.points||[]){const rise=(1-q)*18;
    if(kind==='biohazard')line(c,[[target.x-10,target.y+8],[target.x-6,target.y-rise],[target.x+2,target.y-10],[target.x+8,target.y-rise-9]],color,2);
    else for(const side of [-1,1])path(c,[[target.x+side*12,target.y+7],[target.x+side*16,target.y-12-rise],[target.x+side*8,target.y-22-rise],[target.x+side*5,target.y+7]],'#547e88',color);
   }
  }
  c.save();c.globalAlpha*=.06;const pts=[];for(let i=0;i<12;i++)pts.push([x+Math.cos(i*TAU/12)*radius,y+Math.sin(i*TAU/12)*radius]);path(c,pts,color);c.restore();
  for(let i=0;i<8;i++){
   const a=i*TAU/8+t*.2,tx=x+Math.cos(a)*radius*.8,ty=y+Math.sin(a)*radius*.8;
   if(kind==='biohazard'){line(c,[[x+Math.cos(a)*radius*.4,y+Math.sin(a)*radius*.4],[tx,ty]],color,1.5);gem(c,tx,ty,7,color);}
   else if(kind==='cryomancer'||kind==='moon'){line(c,[[tx-5,ty-6],[tx,ty+6],[tx+5,ty-6]],color,2);gem(c,tx,ty-8,4,color);}
   else{gem(c,tx,ty-(1-q)*15,6,color);}
  }
 }
 c.restore();
}
function drawNightMagic(c,game){
 for(const fx of game.skillSystem?.visualEffects||[])drawSpell(c,fx,game);
 for(const fx of game.pantheon?.effects||[])drawSpell(c,fx,game);
}
module.exports={SKILL_ART,makeSkillEffect,drawNightMagic,drawIcon,drawSpell};
