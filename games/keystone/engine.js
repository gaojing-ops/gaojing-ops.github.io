import {DUNGEONS,SPECS,QUALITIES,SLOTS,affixes,stats,spec,validateTeam} from './data.js';
export const ROUTE=[{x:120,y:140},{x:320,y:140},{x:520,y:140},{x:720,y:140},{x:720,y:340},{x:520,y:340},{x:320,y:340},{x:120,y:340},{x:120,y:540},{x:320,y:540},{x:520,y:540},{x:720,y:540}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function move(a,b,speed,dt){const d=distance(a,b);if(d>1){const step=Math.min(d,speed*dt);a.x+=(b.x-a.x)/d*step;a.y+=(b.y-a.y)/d*step;}}
export class Run{
 constructor({team,dungeon,level=2,equipment={},seed=Date.now()>>>0,id}={}){
  if(!validateTeam(team))throw new Error('队伍需要 1 坦克、1 治疗、3 输出，专精不能重复');
  if(!DUNGEONS.some(d=>d.id===dungeon))throw new Error('请选择有效副本');
  this.version=1;this.id=id||`run-${Date.now()}-${seed}`;this.seed=seed||1;this.dungeon=dungeon;this.level=clamp(Math.floor(level),2,20);this.elapsed=0;this.penalty=0;this.limit=DUNGEONS.find(d=>d.id===dungeon).gameTimer;this.phase='walking';this.paused=false;this.index=0;this.wipes=0;this.reviveTimer=0;this.enemies=[];this.hazards=[];this.effects=[];this.log=[];this.metrics={deaths:0,kills:0,bosses:0,interrupts:0,dodges:0};this.bossNames=DUNGEONS.find(d=>d.id===dungeon).bosses;this.result=null;this.saveClock=0;
  this.heroes=team.map((id,i)=>{const values=stats(id,equipment[id]);return {id,...values,hp:values.maxHp,x:75-i*8,y:140+(i-2)*14,attackCd:i*.12,skillCd:i*.5,interruptCd:0,tauntCd:0,shield:0,shieldTime:0,dead:false,damage:0,healing:0,casts:0,flash:0};});
  this.addLog('小队集结，开始自动探索。');
 }
 random(){let x=this.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 addLog(message){this.log.unshift({time:this.elapsed,text:message});this.log=this.log.slice(0,40);}
 effect(x,y,text,color='#e9c888'){this.effects.push({x,y,text,color,life:1.1});if(this.effects.length>60)this.effects.shift();}
 get boss(){return this.index%4===3;}
 get currentName(){return this.boss?this.bossNames[Math.floor(this.index/4)]:`巡逻队 ${this.index+1-Math.floor(this.index/4)}`;}
 get clock(){return this.elapsed+this.penalty;}
 get progress(){return Math.min(100,Math.round((this.index+(this.phase==='combat'?.2:0))/12*100));}
 spawn(){
  const point=ROUTE[this.index],scale=Math.pow(1.13,this.level-2),fortified=this.level>=4?1.16:1,tyrannical=this.level>=7?1.2:1;
  const count=this.boss?1:3+(this.index%2);this.enemies=[];
  for(let i=0;i<count;i++){
   const kind=this.boss?'boss':i===count-1?'caster':'melee';const hp=(this.boss?5000:430)*scale*(this.boss?tyrannical:fortified);
   this.enemies.push({id:`${this.index}-${i}`,kind,name:this.boss?this.currentName:kind==='caster'?'秘法施术者':'巡逻卫士',maxHp:hp,hp,x:point.x+Math.cos(i*2)*36,y:point.y+Math.sin(i*2)*36,attackCd:.8+i*.25,castCd:this.boss?2:1+i*.25,cast:null,threat:{[this.heroes[0].id]:120},target:this.heroes[0].id,flash:0});
  }
  this.phase='combat';this.addLog(this.boss?`首领战：${this.currentName}`:`遭遇 ${count} 个敌人。`);
 }
 damage(hero,enemy,value){if(!enemy||enemy.hp<=0||hero.dead)return;const crit=this.random()<hero.crit;const amount=value*(crit?1.65:1);const actual=Math.min(enemy.hp,amount);enemy.hp-=actual;hero.damage+=actual;enemy.threat[hero.id]=(enemy.threat[hero.id]||0)+actual;enemy.flash=.12;if(crit)this.effect(enemy.x,enemy.y-22,'暴击 '+Math.round(actual),'#f1d286');if(enemy.hp<=0){this.metrics.kills++;if(enemy.kind==='boss')this.metrics.bosses++;}}
 heal(hero,target,amount){if(target.dead||hero.dead)return;const actual=Math.min(target.maxHp-target.hp,amount);target.hp+=actual;hero.healing+=actual;for(const e of this.enemies)if(e.hp>0)e.threat[hero.id]=(e.threat[hero.id]||0)+actual*.2;if(actual>12)this.effect(target.x,target.y-22,'+'+Math.round(actual),'#9bd4b2');}
 hurt(target,amount){if(!target||target.dead)return;let hit=amount*(1-target.armor);const absorb=Math.min(hit,target.shield);target.shield-=absorb;hit-=absorb;target.hp=Math.max(0,target.hp-hit);target.flash=.15;if(target.hp<=0){target.dead=true;this.metrics.deaths++;this.penalty+=5;this.addLog(`${spec(target.id).job}倒下，计时 +5 秒。`);}}
 skill(hero){
  const info=spec(hero.id),living=this.heroes.filter(h=>!h.dead),targets=this.enemies.filter(e=>e.hp>0);if(!targets.length)return;
  if(info.role==='heal'){
   if(!living.some(h=>h.hp<h.maxHp*.82))return;
   if(info.kind==='burstheal')this.heal(hero,living.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],hero.power*3.2);
   else for(const h of living)this.heal(hero,h,hero.power*(info.kind==='chainheal'?1.3:1.05));
  }else if(info.role==='tank'){
   if(info.kind==='leech'){this.damage(hero,targets[0],hero.power*2);this.heal(hero,hero,hero.power*2.4);}else{hero.shield=hero.maxHp*.18;hero.shieldTime=4;}
   for(const e of targets)e.threat[hero.id]=(e.threat[hero.id]||0)+250;
  }else{for(const enemy of info.kind==='burst'?targets.slice(0,1):targets)this.damage(hero,enemy,hero.power*(info.kind==='burst'?3.8:1.55));}
  hero.casts++;hero.skillCd=(info.role==='heal'?6:info.role==='tank'?7:6.5)*(1-hero.haste);this.effect(hero.x,hero.y-36,info.skill,info.color);
 }
 update(dt){
  if(this.paused||this.result)return;dt=clamp(dt,0,.1);this.elapsed+=dt;
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);for(const h of this.heroes){h.flash=Math.max(0,h.flash-dt);h.attackCd-=dt;h.skillCd-=dt;h.interruptCd=Math.max(0,h.interruptCd-dt);h.tauntCd=Math.max(0,h.tauntCd-dt);h.shieldTime-=dt;if(h.shieldTime<=0)h.shield=0;}
  if(this.elapsed>360){this.finish(false,'远征超过 6 分钟，小队撤离。');return;}
  if(this.phase==='recovering'){this.reviveTimer-=dt;if(this.reviveTimer<=0){for(const h of this.heroes){h.dead=false;h.hp=h.maxHp;h.shield=0;h.x=ROUTE[Math.max(0,this.index-1)].x-60;h.y=ROUTE[Math.max(0,this.index-1)].y;}this.phase='walking';this.addLog('小队复活，重新集结。');}return;}
  if(this.phase==='walking'){
   const point=ROUTE[this.index];for(const [i,h] of this.heroes.entries()){if(h.dead){h.dead=false;h.hp=h.maxHp*.35;}h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.07*dt);move(h,{x:point.x-55-(i===0?0:30),y:point.y+(i-2)*16},92,dt);}
   if(distance(this.heroes[0],{x:point.x-55,y:point.y-32})<5)this.spawn();return;
  }
  for(const hero of this.heroes){
   if(hero.dead)continue;const info=spec(hero.id),point=ROUTE[this.index];
   const hazard=this.hazards.find(z=>z.life>0&&distance(hero,z)<z.r+12);
   const formation={x:point.x-(info.role==='tank'?35:info.role==='heal'?105:75),y:point.y+(this.heroes.indexOf(hero)-2)*24};
   if(hazard){const angle=Math.atan2(hero.y-hazard.y,hero.x-hazard.x);move(hero,{x:hazard.x+Math.cos(angle)*(hazard.r+30),y:hazard.y+Math.sin(angle)*(hazard.r+30)},155*(1+hero.haste),dt);}else move(hero,formation,75,dt);
   if(hero.skillCd<=0)this.skill(hero);
   const casting=this.enemies.find(e=>e.hp>0&&e.cast?.interruptible);
   if(casting&&info.role!=='heal'&&hero.interruptCd===0){casting.cast=null;hero.interruptCd=info.job==='潜行者'?8:13;this.metrics.interrupts++;this.effect(hero.x,hero.y-26,'打断','#91cad8');this.addLog(`${info.job}打断施法。`);}
   if(hero.attackCd<=0){
    hero.attackCd=(info.role==='heal'?1.05:1.1)*(1-hero.haste);
    if(info.role==='heal'){const lowest=this.heroes.filter(h=>!h.dead).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(lowest&&lowest.hp<lowest.maxHp*.98)this.heal(hero,lowest,hero.power*1.25);else this.damage(hero,this.enemies.find(e=>e.hp>0),hero.power*.45);}
    else this.damage(hero,this.enemies.filter(e=>e.hp>0).sort((a,b)=>(b.cast?1:0)-(a.cast?1:0)||a.hp-b.hp)[0],hero.power);
   }
   if(info.role==='tank'&&hero.tauntCd===0){const loose=this.enemies.find(e=>e.hp>0&&e.target!==hero.id);if(loose){const top=Math.max(...Object.values(loose.threat));loose.threat[hero.id]=top+300;hero.tauntCd=5;this.effect(hero.x,hero.y-28,'嘲讽',info.color);}}
  }
  const scale=Math.pow(1.1,this.level-2);
  for(const enemy of this.enemies){
   if(enemy.hp<=0)continue;enemy.flash=Math.max(0,enemy.flash-dt);enemy.attackCd-=dt;enemy.castCd-=dt;
   const alive=this.heroes.filter(h=>!h.dead);if(!alive.length)break;
   const target=alive.slice().sort((a,b)=>(enemy.threat[b.id]||0)-(enemy.threat[a.id]||0))[0];enemy.target=target.id;move(enemy,target,enemy.kind==='caster'?10:35,dt);
   if(enemy.attackCd<=0){enemy.attackCd=enemy.kind==='boss'?1.7:2.1;this.hurt(target,(enemy.kind==='boss'?50:24)*scale);}
   if(enemy.cast){enemy.cast.remaining-=dt;if(enemy.cast.remaining<=0){if(enemy.cast.interruptible){this.hurt(this.heroes.filter(h=>!h.dead).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],70*scale);this.addLog('未打断的法术命中队友。');}enemy.cast=null;}}
   if(enemy.castCd<=0&&!enemy.cast){enemy.castCd=enemy.kind==='boss'?6:9;if(enemy.kind==='caster')enemy.cast={remaining:1.8,total:1.8,interruptible:true};if(enemy.kind==='boss'){enemy.cast={remaining:1.5,total:1.5,interruptible:false};this.bossMechanic(enemy);}}
  }
  for(const hazard of this.hazards){hazard.life-=dt;if(hazard.life<=0&&!hazard.resolved){hazard.resolved=true;for(const h of this.heroes)if(!h.dead){if(distance(h,hazard)<hazard.r)this.hurt(h,hazard.damage*scale);else this.metrics.dodges++;}this.effect(hazard.x,hazard.y,hazard.label,'#ed9e83');}}
  this.hazards=this.hazards.filter(z=>z.life>0);
  if(this.heroes.every(h=>h.dead)){this.wipes++;this.hazards=[];if(this.wipes>=3)this.finish(false,'连续三次团灭，小队撤离。');else{this.phase='recovering';this.reviveTimer=6;this.addLog('团灭：6 秒后复活，重新挑战本组敌人。');}return;}
  if(this.enemies.every(e=>e.hp<=0)){this.hazards=[];this.enemies=[];this.addLog(this.boss?'首领已击败。':'战斗结束，继续前进。');this.index++;if(this.index>=ROUTE.length)this.finish(true,'所有首领已击败。');else this.phase='walking';}
 }
 bossMechanic(enemy){
  const dungeon=DUNGEONS.find(d=>d.id===this.dungeon),living=this.heroes.filter(h=>!h.dead);const focus=living[Math.floor(this.random()*living.length)];if(!focus)return;
  const labels={poison:'剧毒喷涌',shadow:'暗影伏击',quake:'大地震击',bloom:'花棘绽放',void:'虚空裂隙',ritual:'王魂仪式',storm:'雷霆落点',fire:'龙焰吐息'};
  const count=['storm','void','bloom'].includes(dungeon.hazard)?2:1;
  for(let i=0;i<count;i++){const target=living[(living.indexOf(focus)+i)%living.length];this.hazards.push({x:target.x,y:target.y,r:dungeon.hazard==='quake'?65:43,life:1.6,max:1.6,damage:95,label:labels[dungeon.hazard],resolved:false});}
  if(this.level>=10)this.hazards.push({x:enemy.x-90,y:enemy.y+30,r:38,life:2,max:2,damage:75,label:'涌动',resolved:false});
  this.addLog(`${enemy.name}施放${labels[dungeon.hazard]}，小队自动避让。`);
 }
 loot(){
  const slots=Object.keys(SLOTS),roles=['tank','heal','dps','all'],prefix=['守护','晨曦','疾风','星辉','古誓'];const count=this.clock<=this.limit?3:2;const result=[];
  for(let i=0;i<count;i++){
   const roll=this.random(),quality=roll<.18?'epic':roll<.65?'rare':'uncommon',slot=slots[Math.floor(this.random()*slots.length)],role=roles[Math.floor(this.random()*roles.length)],ilvl=12+this.level*4+Math.floor(this.random()*5),budget=(ilvl/10)*QUALITIES[quality].factor;
   result.push({id:`${this.id}-loot-${i}`,name:prefix[Math.floor(this.random()*prefix.length)]+({weapon:'之刃',head:'兜帽',chest:'护甲',boots:'战靴',trinket:'徽记'})[slot],slot,role,quality,ilvl,power:Math.round(budget*(slot==='weapon'?2.4:1.15)),stamina:Math.round(budget*(role==='tank'?10:5)),haste:Math.round(this.random()*budget)*.003,crit:Math.round(this.random()*budget)*.003,from:DUNGEONS.find(d=>d.id===this.dungeon).name});
  }return result;
 }
 finish(success,reason){if(this.result)return;const inTime=this.clock<=this.limit;const upgrade=success&&inTime?(this.clock<this.limit*.65?3:this.clock<this.limit*.8?2:1):0;this.phase=success?'complete':'failed';this.result={id:this.id,dungeon:this.dungeon,level:this.level,success,inTime,upgrade,time:this.elapsed,penalty:this.penalty,reason,metrics:{...this.metrics},heroes:this.heroes.map(h=>({id:h.id,damage:Math.round(h.damage),healing:Math.round(h.healing),casts:h.casts})),loot:success?this.loot():[],date:new Date().toISOString()};this.addLog(success?'通关！打开宝箱查看战利品。':reason);}
 serialize(){return JSON.parse(JSON.stringify(this));}
 static restore(data){
  if(!data||data.version!==1||!validateTeam(data.heroes?.map(h=>h.id))||!DUNGEONS.some(d=>d.id===data.dungeon)||!Number.isInteger(data.index)||data.index<0||data.index>12)throw new Error('远征存档格式无效');
  if(!['walking','combat','recovering','complete','failed'].includes(data.phase)||!data.metrics||typeof data.id!=='string'||data.level<2||data.level>20||data.limit<=0||data.heroes.some(h=>h.maxHp<=0)||(!data.result&&data.index===12))throw new Error('远征状态无效');
  if(JSON.stringify(data).length>1500000)throw new Error('远征存档过大');
  for(const key of ['elapsed','penalty','limit','level','seed','wipes'])if(!Number.isFinite(data[key])||data[key]<0)throw new Error('远征存档数值无效');
  for(const key of ['enemies','hazards','effects','log'])if(!Array.isArray(data[key])||data[key].length>100)throw new Error('远征存档结构无效');
  for(const hero of data.heroes)for(const key of ['hp','maxHp','power','armor','haste','crit','x','y','attackCd','skillCd','interruptCd','tauntCd','shield','shieldTime','damage','healing','casts','flash'])if(!Number.isFinite(hero[key]))throw new Error('队员存档损坏');
  for(const enemy of data.enemies){for(const key of ['hp','maxHp','x','y','attackCd','castCd'])if(!Number.isFinite(enemy[key]))throw new Error('敌人存档损坏');if(!enemy.threat||typeof enemy.threat!=='object')throw new Error('仇恨存档损坏');}
  for(const z of data.hazards)for(const key of ['x','y','r','life','max','damage'])if(!Number.isFinite(z[key]))throw new Error('预警存档损坏');
  const run=Object.assign(Object.create(Run.prototype),JSON.parse(JSON.stringify(data)));run.paused=true;return run;
 }
}
