import {text,damageSource} from './lore.mjs';
const colorCache=new Map(),contexts=new WeakMap();
export function themeColor(value){
 if(typeof value!=='string')return value;if(colorCache.has(value))return colorCache.get(value);
 let result=value,m=value.match(/^#([\da-f]{6})([\da-f]{2})?$/i);
 if(m){
  const n=parseInt(m[1],16),r=n>>16,g=n>>8&255,b=n&255,max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(max-min>90&&max>245){
   // Keep elemental distinctions while removing the imported neon palette.
   result=(r>g*1.25&&r>b*1.1?'#e0816c':b>r*1.25&&b>g*1.15?'#b2a2d4':g>r*1.35&&g>b*1.1?'#8fc48a':r>160&&g>130&&b<160?'#e3b664':g>r*1.15&&b>r*1.15?'#9ecfd4':'#e3c68c')+(m[2]||'');
  }else if(max<45&&b>r*1.25)result='#0e1412'+(m[2]||'');
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
   if(key==='font'&&typeof value==='string')value=value.replace(/sans-serif/g,'"PingFang SC","Microsoft YaHei",sans-serif');
   Reflect.set(target,key,value,target);return true;
  }
 });contexts.set(ctx,proxy);return proxy;
}
export function themeCanvas(canvas){
 if(!canvas?.getContext)return;const original=canvas.getContext.bind(canvas);
 canvas.getContext=(kind,...args)=>kind==='2d'?themedContext(original(kind,...args)):original(kind,...args);
}

export function combatUILayout(width,height){
 const compact=height<420,narrow=width<600||(compact&&width<1000),short=narrow&&compact,r=compact?28:32;
 if(narrow)return {narrow,short,health:{x:8,y:8,w:width-68,h:60},mode:{x:8,y:76,w:width-16,h:24},
  pause:{x:width-52,y:8,w:44,h:44},dash:{cx:width-54,cy:height-(compact?60:66),r},
  skill:{cx:width-54,cy:height-(compact?148:164),r},comboY:62};
 return {narrow,short,health:{x:10,y:10,w:288,h:118},mode:{x:width-238,y:10,w:226,h:58},
  pause:{x:width-56,y:82,w:44,h:44},dash:{cx:width-54,cy:height-(compact?60:66),r},
  skill:{cx:width-54,cy:height-(compact?148:164),r},comboY:164};
}

export function installWebHUD(runtime){
 if(!runtime.catalogs)return;
 const {game,catalogs,art}=runtime;
 const SANS='"PingFang SC","Microsoft YaHei",system-ui,sans-serif';
 const NUM='"Inter","SF Pro Display","Segoe UI",system-ui,sans-serif';
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

 // Flat modern rounded cards aligned with flux.css / folio.css tokens.
 const rrect=(ctx,x,y,w,h,r=10)=>{
  const rad=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rad,y);ctx.lineTo(x+w-rad,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rad);
  ctx.lineTo(x+w,y+h-rad);ctx.quadraticCurveTo(x+w,y+h,x+w-rad,y+h);
  ctx.lineTo(x+rad,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rad);
  ctx.lineTo(x,y+rad);ctx.quadraticCurveTo(x,y,x+rad,y);ctx.closePath();
 };
 const card=(ctx,x,y,w,h,active=false,r=10)=>{
  rrect(ctx,x,y,w,h,r);
  ctx.fillStyle=active?'#18221ef2':'#131b18eb';ctx.fill();
  ctx.strokeStyle=active?'#e3b664b8':'#2e3c36';ctx.lineWidth=active?1.5:1;ctx.stroke();
 };
 const pillBar=(ctx,x,y,w,h,ratio,fill,track='#0d1311')=>{
  const r=h/2,clamped=Math.max(0,Math.min(1,ratio));
  rrect(ctx,x,y,w,h,r);ctx.fillStyle=track;ctx.fill();
  const fw=w*clamped;
  if(fw>1){rrect(ctx,x,y,Math.max(h,fw),h,r);ctx.fillStyle=fill;ctx.fill();}
 };
 const outlined=(ctx,value,x,y,color='#f0c97f')=>{ctx.lineWidth=3;ctx.strokeStyle='#0a100e';ctx.lineJoin='round';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);};
 const fit=(ctx,value,width)=>{let v=text(value);while(v.length&&ctx.measureText(v).width>width)v=v.slice(0,-1);return v===text(value)?v:v.slice(0,-1)+'…';};
 const mobileToast=(ctx,value,w,y)=>{const bw=Math.min(360,w-130);ctx.save();card(ctx,8,y,bw,28,true,8);ctx.font=`600 11px ${SANS}`;ctx.textAlign='left';ctx.fillStyle='#f0c97f';ctx.fillText(fit(ctx,value,bw-16),16,y+18);ctx.restore();};
 const control=(ctx,key,layout,label,cooldown,maxCooldown)=>{
  const {cx,cy,r}=layout,ready=cooldown<=0;
  ctx.save();card(ctx,cx-r,cy-r,r*2,r*2,ready,14);
  rrect(ctx,cx-r+5,cy-r+5,r*2-10,r*2-18,10);ctx.fillStyle=ready?'#1f2b26':'#0f1613';ctx.fill();
  ctx.globalAlpha=ready?1:.4;art.drawIcon?.(ctx,key,cx-20,cy-24,40);ctx.globalAlpha=1;
  ctx.textAlign='center';
  if(!ready){ctx.font=`700 22px ${NUM}`;outlined(ctx,String(Math.ceil(cooldown)),cx,cy+6,'#f0c97f');}
  const progress=ready?1:Math.max(0,Math.min(1,1-cooldown/Math.max(maxCooldown||cooldown,.001)));
  pillBar(ctx,cx-r+8,cy+r-10,r*2-16,4,progress,ready?'#e3b664':'#76847c','#0a100e');
  rrect(ctx,cx-34,cy+r+5,68,20,10);ctx.fillStyle='#131b18e6';ctx.fill();
  ctx.font=`600 11.5px ${SANS}`;ctx.fillStyle=ready?'#e7ece6':'#a0ada5';ctx.fillText(label,cx,cy+r+19);
  ctx.restore();
 };
 const wrap=(ctx,value,width)=>{const lines=[];let line='';for(const char of text(value)){if(char==='\n'||ctx.measureText(line+char).width>width){lines.push(line);line=char==='\n'?'':char;}else line+=char;}if(line)lines.push(line);return lines;};
 const statusLines=(ctx,w)=>{
  const rows=(game.eventEnhancer?.activeEvents||[]).filter(e=>e.type==='bloodMoon').map(e=>`血月临林 · ${Math.ceil(e.timer)} 秒`);
  const oath=game.pantheon;if(oath?.patron)rows.unshift(`${catalogs.pantheon?.DEITIES[oath.patron]?.name||'诸神'}祈誓 · ${Object.values(oath.ranks).reduce((a,b)=>a+b,0)} 阶神赐 · ${catalogs.pantheon?.divineStage(game.player.level).name||'初火'}`);
  if(game.eventEnhancer?.reaperCount>0)rows.push(`索魂者已现 · ${game.eventEnhancer.reaperCount}`);
  const buffs=[['_weaponSurge','焰盛'],['_speedBurst','疾风'],['_xpSurge','悟道'],['_armorBoost','坚壁'],['_drainField','汲魂'],['timeRift','迟暮'],['_densitySurge','黑潮']].filter(([id])=>game[id]?.timer>0);
  if(buffs.length)rows.push(buffs.map(([id,label])=>`${label} ${Math.ceil(game[id].timer)}秒`).join(' · '));
  ctx.save();ctx.font=`500 12px ${SANS}`;const lines=rows.flatMap(row=>wrap(ctx,row,w<600?combatUILayout(w,game.height).mode.w-24:264));ctx.restore();return lines;
 };
 const drawAchievementToast=function(ctx,w,h){
  const toast=this.currentToast;if(!toast)return;if(combatUILayout(w,h).narrow){mobileToast(ctx,text(toast.text)+' · '+text(toast.sub),w,h-78);return;}const bw=Math.min(340,w-145),x=14;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,toast.timer));ctx.font=`11.5px ${SANS}`;
  const lines=wrap(ctx,toast.sub,bw-68),height=48+lines.length*18,y=h-height-56;card(ctx,x,y,bw,height,true,12);
  rrect(ctx,x+11,y+12,34,34,8);ctx.fillStyle='#222e29';ctx.fill();
  art.drawIcon?.(ctx,'crown',x+14,y+15,28);ctx.textAlign='left';ctx.fillStyle='#f0c97f';ctx.font=`600 14.5px ${SANS}`;ctx.fillText(text(toast.text),x+55,y+28);
  ctx.font=`12px ${SANS}`;ctx.fillStyle='#a0ada5';lines.forEach((line,i)=>ctx.fillText(line,x+55,y+48+i*18));ctx.restore();
 };
 const drawEventBanner=function(ctx,w,h){
  const banner=this.eventBanner;if(!banner)return;if(combatUILayout(w,h).narrow){mobileToast(ctx,banner.text,w,h-112);return;}ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,banner.timer));ctx.font=`12.5px ${SANS}`;
  const bw=Math.min(520,w-36),lines=wrap(ctx,banner.text,bw-68),height=26+lines.length*20,x=(w-bw)/2,y=Math.max(h*.3,combatUILayout(w,h).comboY+statusLines(ctx,w).length*20+48);
  card(ctx,x,y,bw,height,true,12);
  rrect(ctx,x+12,y+height/2-17,34,34,8);ctx.fillStyle='#222e29';ctx.fill();
  art.drawIcon?.(ctx,'rune',x+15,y+height/2-14,28);ctx.fillStyle='#e7ece6';ctx.textAlign='left';lines.forEach((line,i)=>ctx.fillText(line,x+56,y+24+i*20));ctx.restore();
 };
 const drawCombatNotices=function(ctx,w){
  const lines=statusLines(ctx,w);if(!lines.length)return;
  const mobile=combatUILayout(w,game.height).narrow;
  if(mobile){ctx.save();ctx.font=`500 10.5px ${SANS}`;ctx.textAlign='left';card(ctx,8,106,w-16,22,false,8);ctx.fillStyle='#e7ece6';ctx.fillText(fit(ctx,lines.join(' · '),w-32),16,121);ctx.restore();return;}
  const x=10,y=138,bw=288;
  ctx.save();card(ctx,x,y,bw,14+lines.length*20,false,10);ctx.textAlign='left';ctx.font=`500 12px ${SANS}`;ctx.fillStyle='#e7ece6';lines.forEach((row,i)=>ctx.fillText(row,x+12,y+21+i*20));ctx.restore();
 };
 if(game.achievements)game.achievements.draw=drawAchievementToast;
 if(game.eventSystem)game.eventSystem.draw=drawEventBanner;
 if(game.eventEnhancer)game.eventEnhancer.draw=drawCombatNotices;
 game._drawHUD=function(){
  const ctx=this.ctx,p=this.player,layout=combatUILayout(this.width,this.height),box=layout.health;
  if(layout.narrow){
   const hp=Math.max(0,Math.min(1,p.hp/p.maxHp)),low=hp<.3,left=box.x+10,right=box.x+box.w-10,bw=box.w-20;
   ctx.save();card(ctx,box.x,box.y,box.w,box.h,false,10);ctx.textAlign='left';ctx.font=`600 12px ${SANS}`;ctx.fillStyle='#e7ece6';ctx.fillText(catalogs.characters[p.characterId]?.name||'守夜者',left,box.y+16);
   ctx.textAlign='right';ctx.font=`600 11.5px ${NUM}`;ctx.fillStyle=low?'#e0816c':'#a0ada5';ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`,right,box.y+16);
   pillBar(ctx,left,box.y+23,bw,8,hp,low?'#e0816c':'#8fc48a');
   pillBar(ctx,left,box.y+36,bw,4,p.xp/p.maxXp,'#e3b664');
   ctx.textAlign='left';ctx.font=`500 10.5px ${SANS}`;ctx.fillStyle='#a0ada5';ctx.fillText(`${p.level} 阶 · 击败 ${p.kills.toLocaleString('zh-CN')}`,left,box.y+53);
   if(this.killCombo>=5){ctx.textAlign='right';ctx.fillStyle='#f0c97f';ctx.fillText(`连杀 ${this.killCombo}`,right,box.y+53);}
   if(p.weapons.length){card(ctx,8,this.height-39,p.weapons.length*24+10,30,false,8);for(let i=0;i<p.weapons.length;i++)art.drawIcon?.(ctx,p.weapons[i].id,14+i*24,this.height-34,20);}
   ctx.restore();this._drawDashButton(ctx);return;
  }
  const barX=box.x+66,barW=box.w-78,right=box.x+box.w-12,hp=Math.max(0,Math.min(1,p.hp/p.maxHp)),low=hp<.3;
  ctx.save();card(ctx,box.x,box.y,box.w,box.h,false,12);
  rrect(ctx,box.x+10,box.y+12,48,48,10);ctx.fillStyle='#1f2b26';ctx.fill();
  art.drawPortrait(ctx,p.characterId,box.x+7,box.y+10,54);
  ctx.textAlign='left';ctx.font=`600 15px ${SANS}`;ctx.fillStyle='#e7ece6';ctx.fillText(catalogs.characters[p.characterId]?.name||'守夜者',barX,box.y+25);
  ctx.textAlign='right';ctx.font=`600 13px ${NUM}`;ctx.fillStyle=low?'#e0816c':'#a0ada5';ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`,right,box.y+25);
  pillBar(ctx,barX,box.y+35,barW,10,hp,low?'#e0816c':'#8fc48a');
  pillBar(ctx,barX,box.y+51,barW,5,p.xp/p.maxXp,'#e3b664');
  ctx.textAlign='left';ctx.font=`500 ${layout.short?12:13}px ${SANS}`;ctx.fillStyle='#e7ece6';ctx.fillText(`第 ${p.level} 阶 · 击败 ${p.kills.toLocaleString('zh-CN')}`,box.x+12,box.y+(layout.short?81:85));
  ctx.font=`500 12px ${SANS}`;ctx.fillStyle='#a0ada5';if(layout.short)ctx.textAlign='right';ctx.fillText(`减伤 ${Math.round((p.armor||0)*100)}%`,layout.short?right:box.x+12,box.y+(layout.short?81:105));
  if(!layout.short){ctx.textAlign='right';ctx.fillStyle='#e3b664';ctx.fillText(`余烬 ${(this.meta?.data.chips||0).toLocaleString('zh-CN')}`,right,box.y+105);}
  if(p.weapons.length){
   card(ctx,10,this.height-48,p.weapons.length*30+10,36,false,10);
   for(let i=0;i<p.weapons.length;i++){
    rrect(ctx,16+i*30,this.height-42,24,24,6);ctx.fillStyle='#1f2b26';ctx.fill();
    art.drawIcon?.(ctx,p.weapons[i].id,17+i*30,this.height-41,22);
   }
  }
  if(!layout.narrow){
   const hint='WASD 移动 · SPACE 闪避 · E 咏誓 · P 暂停';
   ctx.font=`500 11px ${SANS}`;const hw=ctx.measureText(hint).width+22;
   rrect(ctx,(this.width-hw)/2,this.height-32,hw,22,11);ctx.fillStyle='#131b18cc';ctx.fill();
   ctx.textAlign='center';ctx.fillStyle='#8c9a92';ctx.fillText(hint,this.width/2,this.height-17);
  }
  ctx.restore();this._drawDashButton(ctx);
 };
 game._drawPauseButton=function(){
  const ctx=this.ctx,rect=combatUILayout(this.width,this.height).pause;this.pauseBtnRect={...rect};
  const {x,y,w,h}=rect;ctx.save();card(ctx,x,y,w,h,false,10);ctx.fillStyle='#e7ece6';
  rrect(ctx,x+14,y+13,4.5,18,2);ctx.fill();rrect(ctx,x+25.5,y+13,4.5,18,2);ctx.fill();ctx.restore();
 };
 const modePlate=(ctx,w,title,detail,ratio)=>{
  const layout=combatUILayout(w,game.height),{x,y,w:bw,h}=layout.mode,short=h<50;
  if(layout.narrow){ctx.save();card(ctx,x,y,bw,h,false,8);ctx.textAlign='left';ctx.font=`600 11px ${SANS}`;ctx.fillStyle='#e7ece6';ctx.fillText(title,x+10,y+15);ctx.textAlign='right';ctx.fillStyle='#a0ada5';ctx.fillText(detail,x+bw-10,y+15);pillBar(ctx,x+10,y+h-5,bw-20,3,ratio,'#e3b664');ctx.restore();return;}
  ctx.save();card(ctx,x,y,bw,h,false,12);ctx.textAlign='left';ctx.font=`600 13.5px ${SANS}`;ctx.fillStyle='#e7ece6';ctx.fillText(title,x+14,y+23);
  ctx.textAlign='right';ctx.font=`600 12.5px ${NUM}`;ctx.fillStyle='#a0ada5';ctx.fillText(detail,x+bw-14,y+(short?23:38));
  pillBar(ctx,x+14,y+(short?33:45),bw-28,5,ratio,'#e3b664');ctx.restore();
 };
 game._drawSpeedRunHUD=function(){const target=catalogs.speed.KILL_TARGET,elapsed=Math.max(0,this.time-(this.speedRunStartTime||0));modePlate(this.ctx,this.width,'疾行试炼',`${this.speedRunKills||0}/${target} · ${catalogs.speed.formatTime(elapsed*1000)}`,(this.speedRunKills||0)/target);};
 game._drawBossDamagePanel=function(){
  const display=this._bossDamageDisplay;if(!display)return;
  const all=Object.entries(display.log).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]);if(!all.length||this.width<600||this.height<500)return;
  const rows=all.slice(0,2),ctx=this.ctx,bw=226,x=this.width-bw-12,y=138,total=all.reduce((sum,[,value])=>sum+value,0);
  ctx.save();ctx.globalAlpha=Math.min(1,display.timer*2);card(ctx,x,y,bw,96,true,12);ctx.textAlign='left';ctx.fillStyle='#f0c97f';ctx.font=`600 12.5px ${SANS}`;ctx.fillText(text(display.bossName)+' · 已击退',x+12,y+21);
  rows.forEach(([id,value],i)=>{const py=y+38+i*20;ctx.font=`500 11.5px ${SANS}`;ctx.fillStyle='#e7ece6';ctx.fillText(damageSource(id,catalogs).name,x+12,py);ctx.textAlign='right';ctx.fillStyle='#a0ada5';ctx.fillText(Math.round(value/total*100)+'%',x+bw-12,py);ctx.textAlign='left';});
  ctx.font=`500 11px ${SANS}`;ctx.fillStyle='#76847c';ctx.fillText('完整记录：暂停 → 锋芒记录',x+12,y+82);ctx.restore();
 };
 game._drawBossEntrance=function(){
  const be=this._bossEntrance;if(!be||be.timer<=0)return;if(combatUILayout(this.width,this.height).narrow){mobileToast(this.ctx,'强敌来临 · '+text(be.name),this.width,this.height-112);return;}
  const ctx=this.ctx,alpha=Math.min(1,be.timer*2,(1.5-be.timer)*4);ctx.save();ctx.globalAlpha=Math.max(0,alpha);
  const w=Math.min(400,this.width-40),x=(this.width-w)/2,y=this.height*.32;card(ctx,x,y,w,116,true,14);
  rrect(ctx,this.width/2-18,y+12,36,36,10);ctx.fillStyle='#222e29';ctx.fill();
  art.drawIcon?.(ctx,'crown',this.width/2-14,y+16,28);
  ctx.textAlign='center';ctx.fillStyle='#a0ada5';ctx.font=`500 11.5px ${SANS}`;ctx.fillText('林间的强敌，已循火而来',this.width/2,y+66);
  ctx.font=`700 22px ${SANS}`;ctx.fillStyle='#f0c97f';ctx.fillText(be.name,this.width/2,y+96);ctx.restore();
 };
 game._drawDashButton=function(ctx){
  const layout=combatUILayout(this.width,this.height).dash,{cx,cy,r}=layout;this.dashBtnRect={x:cx-r,y:cy-r,w:r*2,h:r*2,cx,cy,r};
  control(ctx,'feather',layout,'闪避',this.player.dashCooldown,this.player.dashMaxCooldown);
 };
 game._drawComboDisplay=function(ctx,dt){
  if(combatUILayout(this.width,this.height).narrow){if(this._comboBreakDisplay?.timer>0)this._comboBreakDisplay.timer=Math.max(0,this._comboBreakDisplay.timer-dt);return;}
  const noticeCount=statusLines(ctx,this.width).length,baseY=combatUILayout(this.width,this.height).comboY+(noticeCount?noticeCount*20+16:0)+(this.safeAreaTop||0);
  if(this.killCombo>=5){
   const combo=this.killCombo,size=combo>=100?26:combo>=75?24:combo>=50?22:combo>=30?20:combo>=15?18:17;
   ctx.font=`700 ${size}px ${SANS}`;ctx.textAlign='center';outlined(ctx,combo+' 连杀',this.width/2,baseY,'#f0c97f');ctx.textAlign='left';
  }
  if(this._comboBreakDisplay&&this._comboBreakDisplay.timer>0){
   this._comboBreakDisplay.timer-=dt;const cbd=this._comboBreakDisplay;
   ctx.globalAlpha=Math.min(1,cbd.timer);ctx.fillStyle='#e0816c';ctx.font=`600 14px ${SANS}`;
   ctx.textAlign='center';ctx.fillText('最终连杀 · '+cbd.count,this.width/2,baseY+26);ctx.textAlign='left';ctx.globalAlpha=1;
  }
 };
 if(catalogs.weaponType&&art.drawArea){
  catalogs.weaponType.prototype.drawGroundEffects=function(ctx){art.drawWeaponGround(ctx,this);};
  catalogs.weaponType.prototype.drawEffects=function(ctx){art.drawWeaponAir(ctx,this);};
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
    c.save();const bw=Math.min(380,w-40),x=(w-bw)/2,y=h*.32;card(c,x,y,bw,120,true,14);
    c.textAlign='center';c.fillStyle='#a0ada5';c.font=`500 12px ${SANS}`;c.fillText(`第 ${this.currentWave+1} 道敌影正在接近`,w/2,y+30);
    c.font=`700 26px ${SANS}`;c.fillStyle='#f0c97f';c.fillText(`候战 · ${Math.max(0,Math.ceil(this.prepTimer))}`,w/2,y+72);
    c.font=`500 11px ${SANS}`;c.fillStyle='#76847c';c.fillText('整理脚步，守住火光',w/2,y+100);c.restore();
   };
  }
  if(this.skillSystem&&!this.skillSystem._webThemed){
   this.skillSystem._webThemed=true;
   this.skillSystem.draw=function(ctx,w,h){
    if(!this.skillDef)return;const layout=combatUILayout(w,h).skill,{cx,cy,r}=layout;this.btnRect={x:cx-r,y:cy-r,w:r*2,h:r*2};
    control(ctx,'skill_'+game.player.characterId,layout,'咏誓',this.cooldown,this.maxCooldown);
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
