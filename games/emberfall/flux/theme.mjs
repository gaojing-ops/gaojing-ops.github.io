import {text} from './lore.mjs';
const colorCache=new Map(),contexts=new WeakMap();
export function themeColor(value){
 if(typeof value!=='string')return value;if(colorCache.has(value))return colorCache.get(value);
 let result=value,m=value.match(/^#([\da-f]{6})([\da-f]{2})?$/i);
 if(m){
  const n=parseInt(m[1],16),r=n>>16,g=n>>8&255,b=n&255,max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(max-min>90&&max>245){
   // Keep elemental distinctions while removing the imported neon palette.
   result=(r>g*1.25&&r>b*1.1?'#c37e67':b>r*1.25&&b>g*1.15?'#a6a0be':g>r*1.35&&g>b*1.1?'#91ae80':r>160&&g>130&&b<160?'#dfbd7f':g>r*1.15&&b>r*1.15?'#b4c8b2':'#d0b987')+(m[2]||'');
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

export function installWebHUD(runtime){
 if(!runtime.catalogs)return;
 const {game,catalogs,art}=runtime;
 const filters=new Map();
 const filterFor=(id,skinId)=>{
  const skins=catalogs.skins[id]||[],skin=skins.find(s=>s.id===skinId);
  if(!skin||skin===skins[0])return 'none';if(filters.has(skin.id))return filters.get(skin.id);
  const color=themeColor(skin.theme.main),rgb=color.slice(1,7).match(/../g).map(s=>parseInt(s,16)/255),[r,g,b]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
  const hue=d===0?40:max===r?60*((g-b)/d%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);
  const base={tracer:40,walker:70,gunner:110,cryomancer:190,biohazard:100,berserker:15,arcane:260,engineer:40,assassin:280}[id]||40;
  const value=`hue-rotate(${Math.round(hue-base)}deg) saturate(.8)`;filters.set(skin.id,value);return value;
 };
 const heroDraw=art.drawHero,portraitDraw=art.drawPortrait;
 art.drawHero=function(ctx,id,...args){ctx.save();ctx.filter=filterFor(id,game.meta?.getSelectedSkin(id));const result=heroDraw(ctx,id,...args);ctx.restore();return result;};
 art.drawPortrait=function(ctx,id,x,y,size,skinId){ctx.save();ctx.filter=filterFor(id,skinId??game.meta?.getSelectedSkin(id));const result=portraitDraw(ctx,id,x,y,size);ctx.restore();return result;};
 // Only presentation methods are replaced; input still uses the source hit rectangles.
 game._drawHUD=function(){
  const c=this.ctx,p=this.player,w=this.width,narrow=w<600,bw=narrow?132:220,x=20,y=24;
  c.save();c.fillStyle='#102019d9';c.fillRect(10,10,bw+26,91);
  c.font='12px "Microsoft YaHei"';c.textAlign='left';c.fillStyle='#ddd6b8';
  c.fillText(catalogs.characters[p.characterId]?.name||'守夜者',x,y+2);
  c.textAlign='right';c.fillStyle='#b7c6a4';c.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`,x+bw,y+2);
  c.fillStyle='#29392d';c.fillRect(x,y+13,bw,6);c.fillStyle=p.hp/p.maxHp<.3?'#c37e67':'#a6bb88';c.fillRect(x,y+13,bw*Math.max(0,p.hp/p.maxHp),6);
  c.fillStyle='#29392d';c.fillRect(x,y+25,bw,3);c.fillStyle='#d5b57a';c.fillRect(x,y+25,bw*Math.min(1,p.xp/p.maxXp),3);
  c.textAlign='left';c.font='10px "Microsoft YaHei"';c.fillStyle='#99ad8b';c.fillText(`第 ${p.level} 阶  ·  击败 ${p.kills}  ·  余烬 ${this.meta?.data.chips||0}`,x,y+45);
  c.fillText(`护甲 ${p.armor||0} · 武器 ${p.weapons.length}/6 · 护符 ${p.passives.length}`,x,y+62);
  const buffs=[['_weaponSurge','焰盛'],['_speedBurst','疾风'],['_xpSurge','悟道'],['_armorBoost','坚壁'],['_drainField','汲魂'],['timeRift','迟暮'],['_densitySurge','黑潮']].filter(([id])=>this[id]?.timer>0);
  c.fillStyle='#b6ab7c';c.fillText(buffs.map(([id,label])=>`${label} ${Math.ceil(this[id].timer)}秒`).join(' · '),20,this.height-23);
  if(this.endlessMode){c.textAlign='right';c.fillText(`无尽守夜 · 第 ${this.endlessWave||1} 潮`,w-24,53);}
  if(!narrow){c.textAlign='right';c.fillText('WASD 移动   SPACE 闪避   E 咏誓   P 暂歇',w-24,this.height-18);}
  c.restore();this._drawDashButton(c);
 };
 game._drawPauseButton=function(){
  const c=this.ctx,x=this.width-56,y=66,size=34;this.pauseBtnRect={x,y,w:size,h:size};
  c.save();c.fillStyle='#14251dda';c.fillRect(x,y,size,size);c.strokeStyle='#9ca88077';c.lineWidth=1;c.strokeRect(x,y,size,size);
  c.fillStyle='#d6c795';c.fillRect(x+12,y+10,3,14);c.fillRect(x+20,y+10,3,14);c.restore();
 };
 game._drawBossEntrance=function(){
  const be=this._bossEntrance;if(!be||be.timer<=0)return;
  const c=this.ctx,alpha=Math.min(1,be.timer*2,(1.5-be.timer)*4);c.save();c.globalAlpha=Math.max(0,alpha);
  const w=Math.min(440,this.width-40),x=(this.width-w)/2,y=this.height*.34;
  c.fillStyle='#102019ed';c.fillRect(x,y,w,119);c.strokeStyle='#c7ad7188';c.lineWidth=1;c.strokeRect(x,y,w,119);
  c.textAlign='center';c.fillStyle='#a69d76';c.font='11px "Microsoft YaHei"';c.fillText('林间的强敌，已循火而来。',this.width/2,y+31);
  c.font='26px "SimSun",serif';c.fillStyle='#e0c38c';c.fillText(be.name,this.width/2,y+77);c.restore();
 };
 game._drawDashButton=function(c){
  const cx=this.width-53,cy=this.height-68,r=28,p=this.player;
  this.dashBtnRect={x:cx-r,y:cy-r,w:r*2,h:r*2,cx,cy,r};
  c.save();c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle='#14251ddd';c.fill();c.strokeStyle=p.dashCooldown<=0?'#d5b57a':'#6f7e64';c.lineWidth=1;c.stroke();
  c.fillStyle='#d5c69d';c.textAlign='center';c.font='13px "Microsoft YaHei"';c.fillText(p.dashCooldown>0?`${Math.ceil(p.dashCooldown)}秒`:'闪避',cx,cy+5);c.restore();
 };
 const damageText=game.spawnDamageNumber.bind(game);
 game.spawnDamageNumber=function(x,y,value,...args){return damageText(x,y,typeof value==='string'?text(value):value,...args);};
 const originalDraw=game.draw.bind(game);
 game.draw=function(){
  if(this.bossRushMode&&!this.bossRushMode._webThemed){
   const mode=this.bossRushMode;mode._webThemed=true;
   mode._drawPrepOverlay=function(c,w,h){
    c.save();const bw=Math.min(420,w-40),x=(w-bw)/2,y=h*.32;c.fillStyle='#102019ed';c.fillRect(x,y,bw,130);c.strokeStyle='#baaa7455';c.strokeRect(x,y,bw,130);
    c.textAlign='center';c.fillStyle='#a3b591';c.font='11px "Microsoft YaHei"';c.fillText(`第 ${this.currentWave+1} 道敌影正在接近`,w/2,y+31);
    c.font='29px "SimSun",serif';c.fillStyle='#dec18a';c.fillText(`候战 · ${Math.max(0,Math.ceil(this.prepTimer))}`,w/2,y+77);
    c.font='10px "Microsoft YaHei"';c.fillStyle='#8da27e';c.fillText('整理脚步，守住火光。',w/2,y+106);c.restore();
   };
  }
  if(this.skillSystem&&!this.skillSystem._webThemed){
   this.skillSystem._webThemed=true;
   this.skillSystem.draw=function(c,w,h){
    if(!this.skillDef)return;const cx=w-53,cy=h-140,r=28;this.btnRect={x:cx-r,y:cy-r,w:r*2,h:r*2};
    c.save();c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle='#14251ddd';c.fill();c.strokeStyle=this.cooldown<=0?'#d5b57a':'#6f7e64';c.lineWidth=1;c.stroke();
    c.fillStyle='#d5c69d';c.textAlign='center';c.font='13px "Microsoft YaHei"';c.fillText(this.cooldown>0?`${Math.ceil(this.cooldown)}秒`:'咏誓',cx,cy+5);c.restore();
   };
  }
  return originalDraw();
 };
}
