import {text} from './lore.mjs';
const colorCache=new Map(),contexts=new WeakMap();
export function themeColor(value){
 if(typeof value!=='string')return value;if(colorCache.has(value))return colorCache.get(value);
 let result=value,m=value.match(/^#([\da-f]{6})([\da-f]{2})?$/i);
 if(m){
  const n=parseInt(m[1],16),r=n>>16,g=n>>8&255,b=n&255,max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(max-min>90&&max>245){
   // Keep elemental distinctions while removing the imported neon palette.
   result=(r>g*1.25&&r>b*1.1?'#e8997b':b>r*1.25&&b>g*1.15?'#b9a6db':g>r*1.35&&g>b*1.1?'#b0cb84':r>160&&g>130&&b<160?'#edc97b':g>r*1.15&&b>r*1.15?'#9ed8dd':'#e8cc96')+(m[2]||'');
  }else if(max<45&&b>r*1.25)result='#102019'+(m[2]||'');
 }else if(/^rgba?\(/i.test(value)){
  const values=value.match(/[\d.]+/g)?.map(Number);
  if(values?.length>=3){const rgb=themeColor('#'+values.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''));
   result=values.length===4?rgb+Math.round(values[3]*255).toString(16).padStart(2,'0'):rgb;}
 }
 colorCache.set(value,result);return result;
}
export function themedContext(ctx){
 if(!ctx||contexts.has(ctx))return contexts.get(ctx)||ctx;
 const bound=new Map();
 const proxy=new Proxy(ctx,{
  get(target,key){
   const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;
   if(bound.has(key))return bound.get(key);
   let fn;
   if(key==='fillText'||key==='strokeText'||key==='measureText')fn=(value,...args)=>target[key](text(value),...args);
   else if(key==='createLinearGradient'||key==='createRadialGradient')fn=(...args)=>{const gradient=target[key](...args);const add=gradient.addColorStop.bind(gradient);gradient.addColorStop=(offset,color)=>add(offset,themeColor(color));return gradient;};
   else fn=value.bind(target);
   bound.set(key,fn);return fn;
  },
  set(target,key,value){
   if(['fillStyle','strokeStyle','shadowColor'].includes(key))value=themeColor(value);
   if(key==='shadowBlur')value=Math.min(4,value);
   if(key==='font'&&typeof value==='string')value=value.replace(/sans-serif/g,'"Microsoft YaHei", sans-serif');
   Reflect.set(target,key,value,target);return true;
  }
 });contexts.set(ctx,proxy);return proxy;
}
export function themeCanvas(canvas){
 if(!canvas?.getContext)return;const original=canvas.getContext.bind(canvas);
 canvas.getContext=(kind,...args)=>kind==='2d'?themedContext(original(kind,...args)):original(kind,...args);
}

export function combatUILayout(width,height){
 const narrow=width<600,compact=height<420,r=compact?28:32;
 return {narrow,health:{x:10,y:10,w:narrow?width-(compact?76:20):288,h:118},
  mode:{x:narrow?10:width-238,y:narrow?138:10,w:narrow?width-(compact?120:76):226,h:58},
  pause:{x:width-56,y:narrow?(compact?10:145):82,w:44,h:44},
  dash:{cx:width-54,cy:height-(compact?60:66),r},
  skill:{cx:width-54,cy:height-(compact?148:164),r},comboY:narrow?226:164};
}

export function installWebHUD(runtime){
 if(!runtime.catalogs)return;
 const {game,catalogs,art}=runtime;
 const filters=new Map();
 const filterFor=(id,skinId)=>{
  const skins=catalogs.skins[id]||[],skin=skins.find(s=>s.id===skinId);
  if(!skin||skin===skins[0])return 'none';if(filters.has(skin.id))return filters.get(skin.id);
  const color=themeColor(skin.theme.main),rgb=color.slice(1,7).match(/../g).map(s=>parseInt(s,16)/255),[r,g,b]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
  const hue=d===0?40:max===r?60*((g-b)/d%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);
  const base={tracer:38,walker:135,gunner:152,cryomancer:188,biohazard:83,berserker:15,arcane:260,engineer:40,assassin:250}[id]||40;
  const value=`hue-rotate(${Math.round(hue-base)}deg) saturate(.8)`;filters.set(skin.id,value);return value;
 };
 const heroDraw=art.drawHero,portraitDraw=art.drawPortrait;
 art.drawHero=function(ctx,id,...args){ctx.save();ctx.filter=filterFor(id,game.meta?.getSelectedSkin(id));const result=heroDraw(ctx,id,...args);ctx.restore();return result;};
 art.drawPortrait=function(ctx,id,x,y,size,skinId){ctx.save();ctx.filter=filterFor(id,skinId??game.meta?.getSelectedSkin(id));const result=portraitDraw(ctx,id,x,y,size);ctx.restore();return result;};
 // All panels use the same chipped stone and brass as the courtyard props.
 const stone=(ctx,x,y,w,h,active=false)=>{
  const cut=6;ctx.beginPath();ctx.moveTo(x+cut,y);ctx.lineTo(x+w-cut,y);ctx.lineTo(x+w,y+cut);ctx.lineTo(x+w,y+h-cut);ctx.lineTo(x+w-cut,y+h);ctx.lineTo(x+cut,y+h);ctx.lineTo(x,y+h-cut);ctx.lineTo(x,y+cut);ctx.closePath();
  ctx.fillStyle='#10251cf7';ctx.fill();ctx.strokeStyle=active?'#ffe0a0':'#b8cba2';ctx.lineWidth=active?2:1.4;ctx.stroke();
  ctx.strokeStyle=active?'#e3c99244':'#a2ae7c2e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+cut+2,y+2);ctx.lineTo(x+w-cut-2,y+2);ctx.stroke();
 };
 const outlined=(ctx,value,x,y,color='#fff3cf')=>{ctx.lineWidth=3;ctx.strokeStyle='#07110d';ctx.lineJoin='round';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);};
 const control=(ctx,key,layout,label,cooldown,maxCooldown)=>{
  const {cx,cy,r}=layout,ready=cooldown<=0;
  ctx.save();stone(ctx,cx-r,cy-r,r*2,r*2,ready);
  if(ready){ctx.fillStyle='#f3cf86';ctx.fillRect(cx-r+3,cy-r+3,r*2-6,r*2-6);}
  ctx.fillStyle='#0a1b14';ctx.fillRect(cx-r+7,cy-r+7,r*2-14,r*2-20);
  ctx.globalAlpha=ready?1:.5;art.drawIcon?.(ctx,key,cx-21,cy-25,42);ctx.globalAlpha=1;
  ctx.textAlign='center';
  if(!ready){ctx.font='700 25px Georgia,serif';outlined(ctx,String(Math.ceil(cooldown)),cx,cy+7);}
  const progress=ready?1:Math.max(0,Math.min(1,1-cooldown/Math.max(maxCooldown||cooldown,.001)));
  ctx.fillStyle='#07120d';ctx.fillRect(cx-r+8,cy+r-15,r*2-16,4);
  ctx.fillStyle='#f3cf86';ctx.fillRect(cx-r+8,cy+r-15,(r*2-16)*progress,4);
  ctx.font='700 10px "Microsoft YaHei",sans-serif';ctx.fillStyle=ready?'#18251a':'#e9efdc';ctx.fillText(ready?'就绪':'冷却',cx,cy+r-3);
  ctx.fillStyle='#0a1b14ee';ctx.fillRect(cx-43,cy+r+5,86,23);
  ctx.font='700 13px "Microsoft YaHei",sans-serif';outlined(ctx,label,cx,cy+r+22);
  ctx.restore();
 };
 // Short-lived messages follow the same stone, engraving and icon system as menus.
 const wrap=(ctx,value,width)=>{const lines=[];let line='';for(const char of text(value)){if(char==='\n'||ctx.measureText(line+char).width>width){lines.push(line);line=char==='\n'?'':char;}else line+=char;}if(line)lines.push(line);return lines;};
 const statusLines=(ctx,w)=>{
  const rows=(game.eventEnhancer?.activeEvents||[]).filter(e=>e.type==='bloodMoon').map(e=>`血月临林 · ${Math.ceil(e.timer)} 秒`);
  if(game.eventEnhancer?.reaperCount>0)rows.push(`索魂者已现 · ${game.eventEnhancer.reaperCount}`);
  const buffs=[['_weaponSurge','焰盛'],['_speedBurst','疾风'],['_xpSurge','悟道'],['_armorBoost','坚壁'],['_drainField','汲魂'],['timeRift','迟暮'],['_densitySurge','黑潮']].filter(([id])=>game[id]?.timer>0);
  if(buffs.length)rows.push(buffs.map(([id,label])=>`${label} ${Math.ceil(game[id].timer)}秒`).join(' · '));
  ctx.save();ctx.font='600 12px "Microsoft YaHei"';const lines=rows.flatMap(row=>wrap(ctx,row,w<600?combatUILayout(w,game.height).mode.w-24:264));ctx.restore();return lines;
 };
 const drawAchievementToast=function(ctx,w,h){
  const toast=this.currentToast;if(!toast)return;const bw=Math.min(360,w-145),x=16;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,toast.timer));ctx.font='11px "Microsoft YaHei"';
  const lines=wrap(ctx,toast.sub,bw-68),height=50+lines.length*18,y=h-height-56;stone(ctx,x,y,bw,height,true);
  art.drawIcon?.(ctx,'crown',x+12,y+15,30);ctx.textAlign='left';ctx.fillStyle='#dec58c';ctx.font='16px "SimSun",serif';ctx.fillText(text(toast.text),x+55,y+28);
  ctx.font='12px "Microsoft YaHei"';ctx.fillStyle='#e0e9cd';lines.forEach((line,i)=>ctx.fillText(line,x+55,y+49+i*18));ctx.restore();
 };
 const drawEventBanner=function(ctx,w,h){
  const banner=this.eventBanner;if(!banner)return;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,banner.timer));ctx.font='12px "Microsoft YaHei"';
  const bw=Math.min(550,w-36),lines=wrap(ctx,banner.text,bw-68),height=24+lines.length*20,x=(w-bw)/2,y=Math.max(h*.32,combatUILayout(w,h).comboY+statusLines(ctx,w).length*20+50);
  stone(ctx,x,y,bw,height,true);art.drawIcon?.(ctx,'rune',x+12,y+height/2-15,30);ctx.fillStyle='#fff0c4';ctx.textAlign='left';lines.forEach((line,i)=>ctx.fillText(line,x+54,y+23+i*20));ctx.restore();
 };
 const drawCombatNotices=function(ctx,w){
  const lines=statusLines(ctx,w);if(!lines.length)return;
  const narrow=w<600,x=10,y=narrow?204:138,bw=narrow?(game.height<420?w-120:w-20):288;
  ctx.save();stone(ctx,x,y,bw,12+lines.length*20);ctx.textAlign='left';ctx.font='600 12px "Microsoft YaHei"';ctx.fillStyle='#f5edcd';lines.forEach((row,i)=>ctx.fillText(row,x+12,y+20+i*20));ctx.restore();
 };
 if(game.achievements)game.achievements.draw=drawAchievementToast;
 if(game.eventSystem)game.eventSystem.draw=drawEventBanner;
 if(game.eventEnhancer)game.eventEnhancer.draw=drawCombatNotices;
 game._drawHUD=function(){
  const ctx=this.ctx,p=this.player,layout=combatUILayout(this.width,this.height),box=layout.health;
  const barX=box.x+64,barW=box.w-78,right=box.x+box.w-12,hp=Math.max(0,Math.min(1,p.hp/p.maxHp)),low=hp<.3;
  ctx.save();stone(ctx,box.x,box.y,box.w,box.h);
  art.drawPortrait(ctx,p.characterId,box.x+2,box.y+13,57);
  ctx.textAlign='left';ctx.font='700 16px "Microsoft YaHei",sans-serif';ctx.fillStyle='#fff0bd';ctx.fillText(catalogs.characters[p.characterId]?.name||'守夜者',barX,box.y+24);
  ctx.textAlign='right';ctx.font='700 16px Georgia,serif';outlined(ctx,`${Math.ceil(p.hp)} / ${p.maxHp}`,right,box.y+24,low?'#ffb19b':'#fff7dc');
  ctx.fillStyle='#040e09';ctx.fillRect(barX,box.y+34,barW,16);
  ctx.fillStyle=low?'#ed8a71':'#b9d96e';ctx.fillRect(barX+1,box.y+35,(barW-2)*hp,14);
  ctx.strokeStyle=low?'#ffc3aa':'#deedb4';ctx.lineWidth=1.5;ctx.strokeRect(barX,box.y+34,barW,16);
  ctx.fillStyle='#040e09';ctx.fillRect(barX,box.y+57,barW,8);ctx.fillStyle='#a7dce1';ctx.fillRect(barX,box.y+57,barW*Math.max(0,Math.min(1,p.xp/p.maxXp)),8);
  ctx.textAlign='left';ctx.font='600 14px "Microsoft YaHei",sans-serif';ctx.fillStyle='#edf2dd';ctx.fillText(`第 ${p.level} 阶 · 击败 ${p.kills.toLocaleString('zh-CN')}`,box.x+12,box.y+88);
  ctx.font='600 12px "Microsoft YaHei",sans-serif';ctx.fillStyle='#e9d69c';ctx.fillText(`减伤 ${Math.round((p.armor||0)*100)}%`,box.x+12,box.y+107);
  ctx.textAlign='right';ctx.fillStyle='#fff0bd';ctx.fillText(`余烬 ${(this.meta?.data.chips||0).toLocaleString('zh-CN')}`,right,box.y+107);
  if(p.weapons.length)stone(ctx,10,this.height-45,p.weapons.length*26+12,34);
  for(let i=0;i<p.weapons.length;i++)art.drawIcon?.(ctx,p.weapons[i].id,17+i*26,this.height-39,22);
  if(!layout.narrow){ctx.textAlign='center';ctx.font='12px "Microsoft YaHei"';outlined(ctx,'WASD 移动    SPACE 闪避    E 咏誓    P 暂停',this.width/2,this.height-18,'#e3eed0');}
  ctx.restore();this._drawDashButton(ctx);
 };
 game._drawPauseButton=function(){
  const ctx=this.ctx,rect=combatUILayout(this.width,this.height).pause;this.pauseBtnRect={...rect};
  const {x,y,w,h}=rect;ctx.save();stone(ctx,x,y,w,h,true);ctx.fillStyle='#ffe1a0';ctx.fillRect(x+14,y+12,4,20);ctx.fillRect(x+25,y+12,4,20);ctx.restore();
 };
 const modePlate=(ctx,w,title,detail,ratio)=>{
  const {x,y,w:bw,h}=combatUILayout(w,game.height).mode;
  ctx.save();stone(ctx,x,y,bw,h);ctx.textAlign='left';ctx.font='700 13px "Microsoft YaHei"';ctx.fillStyle='#fff0bc';ctx.fillText(title,x+12,y+21);
  ctx.textAlign='right';ctx.font='700 13px Georgia,serif';ctx.fillStyle='#fff4d4';ctx.fillText(detail,x+bw-12,y+40);
  ctx.fillStyle='#07130c';ctx.fillRect(x+12,y+47,bw-24,5);ctx.fillStyle='#f1cc80';ctx.fillRect(x+12,y+47,(bw-24)*Math.max(0,Math.min(1,ratio)),5);ctx.restore();
 };
 game._drawSpeedRunHUD=function(){const target=catalogs.speed.KILL_TARGET,elapsed=Math.max(0,this.time-(this.speedRunStartTime||0));modePlate(this.ctx,this.width,'疾行试炼',`${this.speedRunKills||0}/${target} · ${catalogs.speed.formatTime(elapsed*1000)}`,(this.speedRunKills||0)/target);};
 game._drawBossDamagePanel=function(){
  const display=this._bossDamageDisplay;if(!display)return;
  // This timer was advanced by the original draw callback; retain its lifetime.
  display.timer-=(this.frameDt||.016);if(display.timer<=0){this._bossDamageDisplay=null;return;}
  const rows=Object.entries(display.log).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]);if(!rows.length)return;
  const ctx=this.ctx,bw=Math.min(360,this.width-40),x=(this.width-bw)/2,y=138,total=rows.reduce((sum,[,value])=>sum+value,0);
  ctx.save();ctx.globalAlpha=Math.min(1,display.timer*2);stone(ctx,x,y,bw,42+rows.length*29,true);ctx.textAlign='left';ctx.fillStyle='#ddc58c';ctx.font='15px "SimSun",serif';ctx.fillText(text(display.bossName)+' · 锋芒记录',x+14,y+25);
  rows.forEach(([id,value],i)=>{const py=y+43+i*29;art.drawIcon?.(ctx,id,x+12,py-6,21);ctx.font='11px "Microsoft YaHei"';ctx.fillStyle='#b9c3a6';ctx.fillText(id==='_other'?'其他':text(catalogs.weapons[id]?.name||id),x+42,py+8);ctx.textAlign='right';ctx.fillText(Math.round(value/total*100)+'%',x+bw-13,py+8);ctx.textAlign='left';ctx.fillStyle='#ad9c69';ctx.fillRect(x+42,py+15,(bw-90)*value/rows[0][1],2);});ctx.restore();
 };
 game._drawBossEntrance=function(){
  const be=this._bossEntrance;if(!be||be.timer<=0)return;
  const ctx=this.ctx,alpha=Math.min(1,be.timer*2,(1.5-be.timer)*4);ctx.save();ctx.globalAlpha=Math.max(0,alpha);
  const w=Math.min(440,this.width-40),x=(this.width-w)/2,y=this.height*.34;stone(ctx,x,y,w,124,true);
  art.drawIcon?.(ctx,'crown',this.width/2-15,y+10,30);
  ctx.textAlign='center';ctx.fillStyle='#e0e9cd';ctx.font='11px "Microsoft YaHei"';ctx.fillText('林间的强敌，已循火而来。',this.width/2,y+57);
  ctx.font='25px "SimSun",serif';ctx.fillStyle='#e1cca0';ctx.fillText(be.name,this.width/2,y+94);ctx.restore();
 };
 game._drawDashButton=function(ctx){
  const layout=combatUILayout(this.width,this.height).dash,{cx,cy,r}=layout;this.dashBtnRect={x:cx-r,y:cy-r,w:r*2,h:r*2,cx,cy,r};
  control(ctx,'feather',layout,'闪避',this.player.dashCooldown,this.player.dashMaxCooldown);
 };
 game._drawComboDisplay=function(ctx,dt){
  const narrow=this.width<600,noticeCount=statusLines(ctx,this.width).length,baseY=combatUILayout(this.width,this.height).comboY+(noticeCount?noticeCount*20+16:0)+(this.safeAreaTop||0);
  if(this.killCombo>=5){
   const combo=this.killCombo,size=combo>=100?28:combo>=75?26:combo>=50?24:combo>=30?22:combo>=15?20:18;
   ctx.fillStyle=combo>=100?'#ffd700':combo>=75?'#ff44ff':combo>=50?'#ff8800':combo>=30?'#00ccff':combo>=15?'#88ff44':'#ffcc00';
   ctx.font='600 '+size+'px "Songti SC","SimSun",serif';ctx.textAlign='center';outlined(ctx,combo+' 连杀!',this.width/2,baseY,'#ffe4a1');ctx.textAlign='left';
  }
  if(this._comboBreakDisplay&&this._comboBreakDisplay.timer>0){
   this._comboBreakDisplay.timer-=dt;const cbd=this._comboBreakDisplay;
   ctx.globalAlpha=Math.min(1,cbd.timer);ctx.fillStyle='#ff4444';ctx.font='bold 16px sans-serif';
   ctx.textAlign='center';ctx.fillText('最终连杀: '+cbd.count,this.width/2,baseY+28);ctx.textAlign='left';ctx.globalAlpha=1;
  }
 };
 if(catalogs.weaponType&&art.drawArea){
  catalogs.weaponType.prototype.drawGroundEffects=function(ctx){
   for(const pool of this._firePools)art.drawArea(ctx,pool.x,pool.y,pool.radius,'#ff6600',this.game.time);
   for(const pool of this._acidPools)art.drawArea(ctx,pool.x,pool.y,pool.radius,pool.isHolyWater?'#88ddff':'#88ff00',this.game.time);
  };
  catalogs.weaponType.prototype.drawEffects=function(ctx){
   const p=this.game.player;if(!p)return;
   for(const clone of this._clones){const x=p.x+Math.cos(clone.angle)*clone.dist,y=p.y+Math.sin(clone.angle)*clone.dist;art.drawHero(ctx,p.characterId,x,y,13,clone.angle,true,this.game.time,.28);}
   for(const orb of this._orbList)art.drawProjectile(ctx,orb.x,orb.y,orb.radius,'#88ddff','crystal',this.game.time*.4,this.evolved);
  };
 }
 if(catalogs.petType&&art.drawCompanion)catalogs.petType.prototype.draw=function(ctx){art.drawCompanion(ctx,this);};
 if(art.pigment&&game.particles)game.particles.draw=function(ctx){
  ctx.save();ctx.globalCompositeOperation='source-over';
  for(const p of this.particles){const t=Math.max(0,p.life/p.maxLife),size=p.sizeEnd+(p.size-p.sizeEnd)*t;ctx.globalAlpha=t*.85;ctx.fillStyle=art.pigment(p.color).main;
   const angle=Math.atan2(p.vy,p.vx),dx=Math.cos(angle)*size,dy=Math.sin(angle)*size;
   ctx.beginPath();ctx.moveTo(p.x+dx*2,p.y+dy*2);ctx.lineTo(p.x-dy*.6,p.y+dx*.6);ctx.lineTo(p.x-dx,p.y-dy);ctx.lineTo(p.x+dy*.6,p.y-dx*.6);ctx.closePath();ctx.fill();}
  ctx.restore();
 };
 const damageText=game.spawnDamageNumber.bind(game);
 game.spawnDamageNumber=function(x,y,value,...args){return damageText(x,y,typeof value==='string'?text(value):value,...args);};
 const originalDraw=game.draw.bind(game);
 game.draw=function(){
  // Starting a run replaces the event systems; bind the web drawers to each new instance.
  if(this.achievements)this.achievements.draw=drawAchievementToast;
  if(this.eventSystem)this.eventSystem.draw=drawEventBanner;
  if(this.eventEnhancer)this.eventEnhancer.draw=drawCombatNotices;

  if(this.player&&art.drawPlayerActor&&!this.player._webBattleArt){const player=this.player;player._webBattleArt=true;player.draw=ctx=>art.drawPlayerActor(ctx,player,art.drawHero);}
  if(this.bossRushMode&&!this.bossRushMode._webThemed){
   const mode=this.bossRushMode;mode._webThemed=true;
   mode._drawFightingHUD=function(ctx,w){modePlate(ctx,w,'首领连战',`${this.currentWave+1} / 10`,this.currentWave/10);};
   mode._drawPrepOverlay=function(c,w,h){
    c.save();const bw=Math.min(420,w-40),x=(w-bw)/2,y=h*.32;stone(c,x,y,bw,130,true);
    c.textAlign='center';c.fillStyle='#e0e9cd';c.font='11px "Microsoft YaHei"';c.fillText(`第 ${this.currentWave+1} 道敌影正在接近`,w/2,y+31);
    c.font='29px "SimSun",serif';c.fillStyle='#ffe2a2';c.fillText(`候战 · ${Math.max(0,Math.ceil(this.prepTimer))}`,w/2,y+77);
    c.font='10px "Microsoft YaHei"';c.fillStyle='#d8e6c5';c.fillText('整理脚步，守住火光。',w/2,y+106);c.restore();
   };
  }
  if(this.skillSystem&&!this.skillSystem._webThemed){
   this.skillSystem._webThemed=true;
   this.skillSystem.draw=function(ctx,w,h){
    if(!this.skillDef)return;const layout=combatUILayout(w,h).skill,{cx,cy,r}=layout;this.btnRect={x:cx-r,y:cy-r,w:r*2,h:r*2};
    control(ctx,game.player.characterId,layout,'咏誓',this.cooldown,this.maxCooldown);
   };
  }
  if(this.stageSystem&&!this.stageSystem._webArt){
   this.stageSystem._webArt=true;
   this.stageSystem._drawStageHUD=function(ctx,w,h){
    const cfg=catalogs.stages[this.currentStage];if(!cfg||this.game.isSpeedRunMode)return;const left=Math.max(0,cfg.duration-this.stageTime);
    modePlate(ctx,w,this.game.endlessMode?'无尽守夜':cfg.name,this.game.endlessMode?`第 ${this.game.endlessWave||1} 潮`:`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`,this.stageTime/cfg.duration);
   };
  }
  return originalDraw();
 };
}
