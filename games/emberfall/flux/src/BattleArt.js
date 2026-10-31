// Presentation only. Geometry reads the original actors and warning records.
// Warm terracotta marks hostile attacks; friendly elements retain muted pigments.
const F=require('./FacetedArt');
const TAU=Math.PI*2,INK='#0b1713',BONE='#f5e4bc',DANGER='#ed8669',DARK='#8f3f31',GOLD='#e7bd70';
function polygon(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function ring(c,x,y,r,color,alpha=.8,sy=1,n=10){c.save();c.globalAlpha*=alpha;c.lineWidth=1.3;const points=[];for(let i=0;i<n;i++){const a=i/n*TAU;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r*sy]);}polygon(c,points,null,color);c.restore();}
function diamond(c,x,y,r,fill,edge){polygon(c,[[x,y-r],[x+r*.7,y],[x,y+r],[x-r*.7,y]],fill,edge);}
function circleWarning(c,x,y,r,time=0,progress){
 c.save();c.lineWidth=2.6;c.fillStyle=DARK;c.globalAlpha*=.25;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
 c.globalAlpha/= .25;c.globalAlpha*=.85;c.strokeStyle=DANGER;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();
 for(let i=0;i<8;i++){const a=i*TAU/8,dx=Math.cos(a),dy=Math.sin(a);c.beginPath();c.moveTo(x+dx*(r-7),y+dy*(r-7));c.lineTo(x+dx*r,y+dy*r);c.stroke();}
 diamond(c,x,y,Math.min(8,r*.16),DANGER,INK);
 if(progress!==undefined){c.globalAlpha*=.5;c.beginPath();c.arc(x,y,Math.max(0,Math.min(1,progress))*r,0,TAU);c.stroke();}
 c.restore();
}
function lineWarning(c,x,y,angle,width,length){
 c.save();c.translate(x,y);c.rotate(angle||0);c.globalAlpha*=.25;c.fillStyle=DARK;c.fillRect(0,-width/2,length,width);c.globalAlpha/=.25;c.globalAlpha*=.95;c.lineWidth=2.4;
 polygon(c,[[0,-width/2],[length,-width/2],[length,width/2],[0,width/2]],null,DANGER);
 for(let px=22;px<length;px+=46){c.beginPath();c.moveTo(px-6,-Math.min(7,width*.3));c.lineTo(px,0);c.lineTo(px-6,Math.min(7,width*.3));c.stroke();}c.restore();
}
function sector(c,x,y,angle,halfWidth,outer,inner,fill,edge,opacity=.2){
 c.save();c.translate(x,y);c.rotate(angle||0);c.globalAlpha*=opacity;c.beginPath();c.arc(0,0,outer,-halfWidth,halfWidth);if(inner>0)c.arc(0,0,inner,halfWidth,-halfWidth,true);else c.lineTo(0,0);c.closePath();c.fillStyle=fill;c.fill();
 c.globalAlpha/=opacity;c.globalAlpha*=.95;c.lineWidth=2.4;c.strokeStyle=edge;c.stroke();
 for(let r=inner+30;r<outer;r+=55){diamond(c,r,0,5,edge);}c.restore();
}
function drawTelegraph(c,b){
 const t=b.telegraph;if(!t||t.type==='none')return;
 c.save();const time=b.game.time||0;c.globalAlpha*=.9+Math.sin(time*6)*.06;
 if(t.type==='circle')circleWarning(c,t.x,t.y,t.radius,time);
 else if(t.type==='multi_circle')for(const target of t.targets)circleWarning(c,target.x,target.y,t.radius,time);
 else if(t.type==='line')lineWarning(c,t.x,t.y,t.angle,t.width,t.length);
 else if(t.type==='multi_line')for(const angle of t.angles)lineWarning(c,t.x,t.y,angle,t.width,t.length);
 else if(t.type==='cone')sector(c,t.x,t.y,t.angle,t.width/2,t.length,0,DARK,DANGER,.16);
 else if(t.type==='fullscreen'){
  const {camera,width,height}=b.game;c.fillStyle=DARK;c.globalAlpha*=.1;c.fillRect(camera.x,camera.y,width,height);c.globalAlpha/=.1;c.strokeStyle=DANGER;c.lineWidth=2;c.strokeRect(camera.x+5,camera.y+5,width-10,height-10);
  for(const [x,y] of [[camera.x+20,camera.y+height/2],[camera.x+width-20,camera.y+height/2]])diamond(c,x,y,12,DANGER,INK);
 }c.restore();
}
function drawBossGround(c,b){
 const e=b._sustainedEffect;if(e){
  if(e.type==='laserSweep')sector(c,b.x,b.y,e.angle,.13,390,b.radius,'#845746',DANGER,.3);
  else if(e.type==='deathRay')sector(c,b.x,b.y,e.angle,.22,1200,b.radius,'#77536f','#ce9fb3',.3);
  else if(e.type==='deathMark')circleWarning(c,e.targetX,e.targetY,130,b.game.time);
  else if(e.type==='shockwave'){
   // The original collision check is |distance-radius| < 42.
   c.save();c.globalAlpha*=Math.max(0,Math.min(.55,e.timer/.7*.55));c.fillStyle=DANGER;c.beginPath();c.arc(b.x,b.y,e.radius+42,0,TAU);c.arc(b.x,b.y,Math.max(0,e.radius-42),0,TAU,true);c.fill('evenodd');c.restore();
   c.save();c.globalAlpha*=.7;c.strokeStyle=DANGER;c.lineWidth=1.5;c.beginPath();c.arc(b.x,b.y,e.radius+42,0,TAU);c.stroke();if(e.radius>42){c.beginPath();c.arc(b.x,b.y,e.radius-42,0,TAU);c.stroke();}c.restore();
  }else if(e.type==='bloodPool'||e.type==='voidRift'){
   F.drawArea(c,e.x,e.y,e.radius,e.type==='bloodPool'?'#ff0044':'#aa00ff',b.game.time);circleWarning(c,e.x,e.y,e.radius,b.game.time);
  }
 }drawTelegraph(c,b);
}
function drawBossActor(c,b){
 if(!F.drawBoss(c,b))return false;
 const w=Math.max(132,b.radius*3.8),x=b.x-w/2,y=b.y-b.radius*2.05-12,pct=Math.max(0,Math.min(1,b.hp/b.maxHp));
 c.save();c.lineWidth=1.5;c.fillStyle='#07140f';c.fillRect(x-4,y-4,w+8,19);c.strokeStyle='#e7ce99';c.strokeRect(x-4,y-4,w+8,19);
 c.fillStyle=pct>.35?'#edbd78':'#ed8c74';c.fillRect(x,y,w*pct,10);c.fillStyle=INK;for(const mark of [.35,.7])c.fillRect(x+w*mark-1,y,2,10);
 c.font='700 14px "Microsoft YaHei",sans-serif';c.textAlign='center';const titleW=Math.max(w,c.measureText(b.name).width+16);c.fillStyle='#07140ff0';c.fillRect(b.x-titleW/2,y-29,titleW,22);c.fillStyle='#fff0c3';c.fillText(b.name,b.x,y-12);
 c.font='700 10px Georgia,serif';c.lineWidth=3;c.strokeStyle='#07140f';const hp=`${Math.ceil(b.hp)} / ${b.maxHp}`;c.strokeText(hp,b.x,y+9);c.fillStyle='#fff9df';c.fillText(hp,b.x,y+9);
 for(let i=0;i<(b.phase||1);i++)diamond(c,b.x+(i-((b.phase||1)-1)/2)*9,y+23,3,b.phase===3?DANGER:GOLD);
 if(b.shield>0)ring(c,b.x,b.y-b.radius*.45,b.radius*1.55,'#a8bbb5',.75,1.25,8);c.restore();return true;
}
function drawEnemyGround(c,e){if(e.behavior==='charger'&&e._chargeState==='aiming')lineWarning(c,e.x,e.y,e._chargeAngle,Math.max(8,e.radius*2),800);}
function drawEnemyActor(c,e){
 if(!F.MONSTERS[e.type])return false;
 const r=e.radius,time=e.game.time||0;c.save();
 if(e.isInvisible)c.globalAlpha*=.28;
 if(e.hasRageAura||(e.berserkerAffix&&e.hp/e.maxHp<.5))ring(c,e.x,e.y+r*.7,r*1.5,DANGER,.65,.45);
 if(e.regeneratingAffix)ring(c,e.x,e.y+r*.7,r*1.35,'#a3bc86',.5,.45);
 if(e.poisoned>0){c.save();c.globalAlpha*=.4;for(let i=0;i<3;i++){const a=time+i*TAU/3;diamond(c,e.x+Math.cos(a)*r,e.y-r*.4+Math.sin(a)*r*.5,3,'#9fb875');}c.restore();}
 F.drawMonster(c,e);
 if(e.frozen>0){c.save();c.globalAlpha*=.65;for(const side of [-1,1])polygon(c,[[e.x+side*r*1.05,e.y+r*.6],[e.x+side*r*1.3,e.y-r*.7],[e.x+side*r*.6,e.y-r*1.3],[e.x+side*r*.5,e.y+r*.6]],'#8baead','#d2dfce');c.restore();}
 if(e.shield>0||e.invincibleTimer>0)ring(c,e.x,e.y-r*.5,r*1.4,e.invincibleTimer>0?GOLD:'#a4b8bc',.75,1.2,8);
 if(e.isElite){F.drawIcon(c,'crown',e.x-9,e.y-r*2.5-15,18);ring(c,e.x,e.y+r*.8,r*1.4,GOLD,.65,.38);if(e.game.qualityLevel>=.5)for(let i=0;i<(e._affixColors||[]).length;i++)diamond(c,e.x+(i-((e._affixColors.length-1)/2))*9,e.y-r*2.5-18,3,F.pigment(e._affixColors[i]).main);}
 if(e._isBounty)F.drawIcon(c,'coin',e.x-8,e.y-r*2.5-34,16);c.restore();return true;
}
function drawHostileProjectiles(c,group,color){
 if(!group.length)return;c.save();c.fillStyle='#873f35';c.strokeStyle=DANGER;c.lineWidth=1.6;
 c.beginPath();for(const b of group){const r=b.radius,k=r*Math.SQRT1_2;c.moveTo(b.x,b.y-r);c.lineTo(b.x+k,b.y-k);c.lineTo(b.x+r,b.y);c.lineTo(b.x+k,b.y+k);c.lineTo(b.x,b.y+r);c.lineTo(b.x-k,b.y+k);c.lineTo(b.x-r,b.y);c.lineTo(b.x-k,b.y-k);c.closePath();}c.fill();c.stroke();
 c.fillStyle=BONE;c.beginPath();for(const b of group){const r=Math.min(2,b.radius*.38);c.moveTo(b.x,b.y-r);c.lineTo(b.x+r,b.y);c.lineTo(b.x,b.y+r);c.lineTo(b.x-r,b.y);c.closePath();}c.fill();c.restore();
}
function drawMortarWarnings(c,warnings,time){for(const w of warnings||[])if(w.active)circleWarning(c,w.x,w.y,w.radius,time,1-w.timer/1.5);}
function drawPulse(c,p,time){if(!p)return;c.save();c.globalAlpha*=p.a;F.drawArea(c,p.x,p.y,p.r,p.color,time);const color=F.pigment(p.color).light;for(let i=0;i<8;i++){const a=i*TAU/8;diamond(c,p.x+Math.cos(a)*p.r*.72,p.y+Math.sin(a)*p.r*.72,Math.min(7,p.r*.08),color);}c.restore();}
function drawPlayerActor(c,p,heroDraw=F.drawHero){
 const time=p.game.time||0,aura=p.game.meta?.data.selectedAura;c.save();
 if(aura){const colors={magic_circle:GOLD,crimson_aegis:DANGER,aurora_trail:'#a8b9c0',void_phantom:'#a692b4',crown_of_kings:GOLD},color=colors[aura]||GOLD;ring(c,p.x,p.y+p.radius*.8,30,color,.55,.4,12);if(aura==='crown_of_kings')F.drawIcon(c,'crown',p.x-10,p.y-p.radius*2.4-20,20);if(aura==='void_phantom')for(let i=0;i<(p._history||[]).length;i+=4){const point=p._history[i];heroDraw(c,p.characterId,point.x,point.y,p.radius,p.facingAngle,false,time,.08);}}
 if(p.dashActiveTimer>0)for(const point of (p.trail||[]).slice(-6)){if(point.a>0)heroDraw(c,p.characterId,point.x,point.y,p.radius,point.angle,true,time,point.a*.15);}
 else for(const point of p.trail||[]){c.save();c.globalAlpha*=point.a*.25;diamond(c,point.x,point.y,2,GOLD);c.restore();}
 heroDraw(c,p.characterId,p.x,p.y,p.radius,p.facingAngle,p.isMoving,time);
 if(p.game.playerInvincible>0)ring(c,p.x,p.y-p.radius*.45,p.radius*1.35,'#c9c8a0',.7,1.2,8);
 for(const pet of p.pets||[])pet.draw(c);c.restore();return true;
}
module.exports={drawTelegraph,drawBossGround,drawBossActor,drawEnemyGround,drawEnemyActor,drawHostileProjectiles,drawMortarWarnings,drawPlayerActor,drawPulse,circleWarning,lineWarning,sector};
