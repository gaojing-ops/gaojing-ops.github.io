// Emberfall's original hand-painted art atlases. Presentation only; no combat rules.
const layout=require('./ArtLayout');
const images={};let pending;
const HEROES=['tracer','walker','gunner','cryomancer','biohazard','berserker','arcane','engineer','assassin'];
const MONSTERS=['Bat','Skeleton','Ghost','DataWorm','SwarmDrone','Hornet','FireFly','Crawler','WarpMite','Turret','LaserDrone','ScatterGun','SpiralCaster','MortarDrone','ChainGunner','FrostWisp','SlimeGlob','CyberSpider','GlitchEntity','FrostTitan','PlagueSource','IronGolem','RoyalSlime','VoidLeech','Assassin','Bomber','ShieldBearer','Charger','MiniSpider','ToxicBlob','Healer','ShieldPriest','LootGoblin','Splitter','Phantom'];
const MAPS={CyberGrid:0,ToxicSwamp:1,CryoRealm:2,VoidNebula:3,Matrix:4};
function preload(){
 if(pending)return pending;
 pending=Promise.all(Object.keys(layout).filter(name=>name!=='terrain').map(name=>new Promise(resolve=>{
  try{const image=wx.createImage();image.onload=()=>{images[name]=image;resolve();};image.onerror=()=>{console.warn('Art atlas unavailable:',name);resolve();};image.src='art/'+name+'.png';}catch{resolve();}
 })));return pending;
}
function drawSprite(ctx,sheet,index,x,y,extent,flip=false,bob=0,flash=false,alpha=1){
 const image=images[sheet],rect=layout[sheet]?.rects[index];if(!image||!rect)return false;
 const [sx,sy,sw,sh]=rect,scale=extent/Math.max(sw,sh),w=sw*scale,h=sh*scale;
 ctx.save();ctx.translate(x,y+bob);if(flip)ctx.scale(-1,1);
 ctx.globalAlpha*=alpha;if(flash)ctx.filter='brightness(1.7)';
 ctx.drawImage(image,sx,sy,sw,sh,-w/2,-h*.65,w,h);ctx.restore();return true;
}
function drawHero(ctx,id,x,y,radius,angle=0,moving=false,time=0,alpha=1){
 const index=HEROES.indexOf(id);if(index<0)return false;
 if(images.heroes){ctx.save();ctx.strokeStyle='rgba(245,205,126,.65)';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(x,y+radius*.8,radius*.95,radius*.4,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 return drawSprite(ctx,'heroes',index,x,y,radius*4,Math.cos(angle)<0,moving?Math.sin(time*11)*1.6:0,false,alpha);
}
function drawPortrait(ctx,id,x,y,size){
 const index=HEROES.indexOf(id),image=images.heroes,rect=layout.heroes.rects[index];if(!image||!rect)return false;
 const [sx,sy,sw,sh]=rect,scale=size/Math.max(sw,sh),w=sw*scale,h=sh*scale;
 ctx.drawImage(image,sx,sy,sw,sh,x+(size-w)/2,y+(size-h)/2,w,h);return true;
}
function drawMonster(ctx,enemy){
 const index=MONSTERS.indexOf(enemy.type);if(index<0)return false;
 const time=enemy.game.time||0,flip=enemy.game.player.x<enemy.x;
 return drawSprite(ctx,'monsters',index,enemy.x,enemy.y,enemy.radius*3.5,flip,Math.sin(time*6+enemy.x*.1)*Math.min(1.2,enemy.radius*.1),enemy.flashTimer>0);
}
function drawBoss(ctx,boss){return drawSprite(ctx,'bosses',boss.artIndex||0,boss.x,boss.y,boss.radius*3.3,boss.game.player.x<boss.x,Math.sin(boss.game.time*2)*1.5,boss.flashTimer>0);}
module.exports={preload,drawHero,drawPortrait,drawMonster,drawBoss,HEROES,MONSTERS};
