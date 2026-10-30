import {getMap} from './maps.js';
import {DUNGEONS,stats,spec,validateTeam} from './data.js';
import {RULES,TRINKETS,makeItem,tierForLevel,aoeFactor,interval} from './rules.js';
import {defaultPlan,compilePlan,groups,group,dist,pathTo,navigable,corridorDistance} from './routes.js';
import {RUBY_DATA} from './ruby-data.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Run {
 constructor({team,dungeon,level=2,equipment={},plan,seed=Date.now()>>>0,id}={}){
  if(!validateTeam(team)||!DUNGEONS.some(d=>d.id===dungeon))throw Error('请选择有效队伍和副本');
  Object.assign(this,{version:3,id:id||`run-${Date.now()}-${seed}`,seed:seed||1,dungeon,level:clamp(level,2,20),elapsed:0,penalty:0,limit:RULES.limit,phase:'walking',paused:false,accumulator:0,index:0,pathCursor:0,transportedIndex:-1,wipes:0,reviveTimer:0,enemies:[],hazards:[],effects:[],log:[],result:null,metrics:{deaths:0,kills:0,bosses:0,interrupts:0,dodges:0,missedInterrupts:0,hazardHits:0},killed:[],pulled:[],forces:0,waves:[],battleClock:0,engageClock:0,mergeCursor:1,travel:[],trail:[],equipment:JSON.parse(JSON.stringify(equipment))});
  this.plan=dungeon==='ruby'?JSON.parse(JSON.stringify(plan||defaultPlan())):null;
  this.nodes=dungeon==='ruby'?compilePlan(this.plan):JSON.parse(JSON.stringify(getMap(dungeon).route));
  this.bossNames=getMap(dungeon).bosses;
  const entry=getMap(dungeon).entrance;
  this.heroes=team.map((id,i)=>{const v=stats(id,equipment[id]);return {id,...v,hp:v.maxHp,x:entry.x,y:entry.y,attackCd:i*.15,skillCd:0,interruptCd:0,tauntCd:0,trinketCd:0,shield:0,shieldTime:0,dead:false,damage:0,healing:0,overheal:0,taken:0,rangeLost:0,uptime:0,casts:0,flash:0,hot:0,hotTimer:0,cast:null,state:'跟随',target:null,moving:false,trailCursor:0};});
  this.trail=[{...entry}];this.addLog('小队集结，坦克领路。');
 }
 get route(){return this.nodes;}
 get boss(){return this.route[this.index]?.kind==='boss';}
 get currentName(){return this.route[this.index]?.display||this.route[this.index]?.area||'远征结束';}
 get clock(){return this.elapsed+this.penalty;}
 get progress(){return this.dungeon==='ruby'?Math.min(100,Math.round(this.forces/RUBY_DATA.totalForces*100)):Math.min(100,Math.round(this.index/this.route.length*100));}
 random(){let x=this.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 addLog(text){this.log.unshift({time:this.elapsed,text});this.log=this.log.slice(0,40);}
 effect(x,y,text,color='#e9c888'){this.effects.push({x,y,text,color,life:1.1});if(this.effects.length>60)this.effects.shift();}
 range(a,b,yards){return !!b&&dist(a,b)<=yards*RULES.unitsPerYard+(a.kind||b.kind?8:2);}
 move(h,p,speed,dt,constrain=true){const d=dist(h,p);if(d<2)return false;const step=Math.min(d,speed*dt),q={x:h.x+(p.x-h.x)/d*step,y:h.y+(p.y-h.y)/d*step};if(constrain&&!navigable(this.dungeon,q,38)&&corridorDistance(this.dungeon,q)>corridorDistance(this.dungeon,h)+.01)return false;h.x=q.x;h.y=q.y;return true;}
 alive(){return this.heroes.filter(h=>!h.dead);}
 targets(){return this.enemies.filter(e=>e.hp>0);}
 spawnGroup(g){
  if(this.pulled.includes(g.id))return;this.pulled.push(g.id);
  for(const [i,m] of g.members.entries())if(!this.killed.includes(m.id))this.createEnemy({...m,kind:m.spells.length&&i%3===0?'caster':'melee',group:g.id},g,i);
 }
 createEnemy(m,p,i=0){
  const hp=(m.kind==='boss'?RULES.bossHp:this.dungeon==='ruby'?RULES.rubyTrashHp:RULES.trashHp)*Math.pow(RULES.hpGrowth,this.level-2)*(this.bossNames.length===4?.86:1);
  this.enemies.push({...m,maxHp:hp,hp,x:p.x+Math.cos(i*2)*9,y:p.y+Math.sin(i*2)*9,attackCd:1+i*.15,castCd:3+i,cast:null,threat:{[this.heroes[0].id]:100},target:this.heroes[0].id,flash:0});
 }
 spawn(){
  const n=this.route[this.index];this.enemies=[];this.engageClock=0;this.battleClock=0;this.mergeCursor=1;this.pulled=[];
  this.wave={index:this.index,name:this.currentName,start:this.elapsed,time:0,deaths:[],missedInterrupts:0,hazardHits:0,extra:[]};
  if(n.kind==='boss')this.createEnemy({id:`boss-${n.bossIndex}`,kind:'boss',name:n.display,forces:0},n);
  else if(this.dungeon==='ruby')this.spawnGroup(group(n.groups[0]));
  else for(let i=0;i<3+(this.index%2);i++)if(!this.killed.includes(`${this.index}-${i}`))this.createEnemy({id:`${this.index}-${i}`,kind:i===2?'caster':'melee',name:n.enemies?.[i%n.enemies.length]||'卫士',forces:0},n,i);
  this.phase='combat';this.addLog('接战：'+this.currentName);
 }
 damage(hero,enemy,value,{critical=true}={}){
  if(!enemy||enemy.hp<=0||hero.dead||!this.range(hero,enemy,spec(hero.id).attackRange))return 0;
  const amount=value*(critical&&this.random()<hero.crit?RULES.critMultiplier:1),actual=Math.min(enemy.hp,amount);enemy.hp-=actual;hero.damage+=actual;enemy.threat[hero.id]=(enemy.threat[hero.id]||0)+actual*(spec(hero.id).role==='tank'?5:1);enemy.flash=.12;
  if(enemy.hp<=0&&!this.killed.includes(enemy.id)){this.killed.push(enemy.id);this.metrics.kills++;if(enemy.kind==='boss')this.metrics.bosses++;else this.forces+=enemy.forces||0;}return actual;
 }
 heal(hero,target,amount){if(!target||target.dead||hero.dead||!this.range(hero,target,spec(hero.id).healRange))return 0;const actual=Math.min(target.maxHp-target.hp,amount);target.hp+=actual;hero.healing+=actual;hero.overheal+=amount-actual;for(const e of this.targets())e.threat[hero.id]=(e.threat[hero.id]||0)+actual*.1;return actual;}
 hurt(h,value,source='近战攻击'){if(!h||h.dead)return;let hit=value*(1-h.armor);const absorb=Math.min(h.shield,hit);h.shield-=absorb;hit-=absorb;h.taken+=Math.min(hit,h.hp);h.hp=Math.max(0,h.hp-hit);h.flash=.12;if(h.hp<=0){h.dead=true;h.cast=null;h.state='倒下';this.metrics.deaths++;this.penalty+=RULES.deathPenalty;this.wave?.deaths.push({hero:h.id,source});this.addLog(`${spec(h.id).job}倒下：${source}，罚时 5 秒`);}}
 aoe(h,target,value,critical=true){const enemies=this.targets().filter(e=>this.range(h,e,spec(h.id).attackRange)&&dist(e,target)<=spec(h.id).areaRadius*RULES.unitsPerYard).sort((a,b)=>dist(a,target)-dist(b,target));for(const [i,e] of enemies.entries())if(i<10)this.damage(h,e,value*aoeFactor(i),{critical});}
 skill(h,target){
  const s=spec(h.id),living=this.alive(),near=living.filter(t=>this.range(h,t,s.healRange));
  if(s.role==='heal'){
   const injured=near.filter(t=>t.hp<t.maxHp*.85);if(!injured.length)return false;
   if(s.kind==='burstheal')this.heal(h,injured.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],h.power*5);
   else for(const t of injured){if(s.kind==='hot'){t.hot=h.power*.8;t.hotTimer=6;t.hotSource=h.id;}else this.heal(h,t,h.power*2.3);}
  }else if(s.role==='tank'){
   if(s.kind==='leech'){if(!this.range(h,target,s.attackRange))return false;this.damage(h,target,h.power*2.5);this.heal(h,h,h.power*3.5);}else{h.shield=h.maxHp*(s.kind==='block'?.25:.22);h.shieldTime=5;}
   for(const e of this.targets())if(this.range(h,e,s.tauntRange))e.threat[h.id]=(e.threat[h.id]||0)+350;
  }else{
   if(!this.range(h,target,s.attackRange))return false;
   if(s.kind==='burst')this.damage(h,target,h.power*5.5);else{this.aoe(h,target,h.power*2.4);if(s.kind==='frost')for(const e of this.targets())if(dist(e,target)<30)e.slow=3;}
  }
  h.skillCd=interval(s.skillCooldown,h.haste);h.casts++;this.effect(h.x,h.y-28,s.skill,s.color);return true;
 }
 trinket(h,target){const item=h.trinket;if(!item||h.trinketCd>0)return;const e=item.effect,s=spec(h.id),m=1+(item.tier||0)*.02;let used=false;
  if(e==='shield'&&h.hp<h.maxHp*.45){h.shield+=h.maxHp*.25*m;h.shieldTime=6;used=true;}
  if(e==='recover'&&h.hp<h.maxHp*.6){this.heal(h,h,h.maxHp*.2*m);used=true;}
  const near=this.alive().filter(t=>this.range(h,t,s.healRange));
  if(e==='rescue'){const t=near.find(t=>t.hp<t.maxHp*.4);if(t){this.heal(h,t,h.power*5*m);used=true;}}
  if(e==='renewal'&&near.filter(t=>t.hp<t.maxHp*.75).length>=2){for(const t of near)this.heal(h,t,h.power*2.5*m);used=true;}
  if(['single','cleave'].includes(e)&&this.range(h,target,s.attackRange)&&this.burstAllowed()){if(e==='single')this.damage(h,target,h.power*5*m,{critical:false});else this.aoe(h,target,h.power*2.2*m,false);used=true;}
  if(used){h.trinketCd=TRINKETS[e].cooldown;this.effect(h.x,h.y-36,TRINKETS[e].name,s.color);}
 }
 burstAllowed(){const n=this.route[this.index];return !!n.burst||!this.route.slice(this.index+1).some(n=>n.burst);}
 advance(realDelta,speed=1){if(this.paused||this.result)return;this.accumulator+=Math.min(.12,Math.max(0,realDelta))*speed;while(this.accumulator>=.04-1e-10&&!this.result){this.accumulator-=.04;this.update(.04);}if(this.result)this.accumulator=0;}
 update(dt){
  if(this.paused||this.result)return;dt=clamp(dt,0,.1);this.elapsed+=dt;if(this.elapsed>=RULES.hardLimit){this.finish(false,'达到 12 分钟，小队撤离');return;}
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  for(const h of this.heroes){for(const k of ['attackCd','skillCd','interruptCd','tauntCd','trinketCd','flash'])h[k]=Math.max(0,h[k]-dt);h.shieldTime-=dt;if(h.shieldTime<=0)h.shield=0;h.moving=false;if(h.hotTimer>0&&!h.dead){const healer=this.heroes.find(x=>x.id===h.hotSource);if(healer&&!healer.dead)this.heal(healer,h,h.hot*dt);h.hotTimer-=dt;}}
  if(this.phase==='recovering'){this.reviveTimer-=dt;if(this.reviveTimer<=0){for(const h of this.heroes){h.dead=false;h.hp=h.maxHp;h.cast=null;h.x=this.recoverPoint.x;h.y=this.recoverPoint.y;}this.trail=[{...this.recoverPoint}];for(const h of this.heroes)h.trailCursor=0;this.travel=[];this.phase='walking';}return;}
  if(this.phase==='walking'){this.walk(dt);return;}
  this.combat(dt);
 }
 walk(dt){
  const n=this.route[this.index],leader=this.heroes[0];
  if(n.transport&&this.transportedIndex!==this.index){this.transportedIndex=this.index;for(const h of this.heroes){h.x=n.transport.x;h.y=n.transport.y;}this.trail=[{...n.transport}];for(const h of this.heroes)h.trailCursor=0;this.travel=[];this.addLog(n.transport.label);}
  if(!this.travel.length&&dist(leader,n)>=5){const p=pathTo(this.dungeon,leader,n);this.travel=p||[...(n.via||[]),{x:n.x,y:n.y}];}
  const dest=this.travel[0]||n;this.move(leader,dest,RULES.followSpeed,dt,false);leader.state='领队';
  if(dist(leader,dest)<3)this.travel.shift();
  if(dist(leader,this.trail.at(-1))>5)this.trail.push({x:leader.x,y:leader.y});if(this.trail.length>1000){this.trail.shift();for(const h of this.heroes)h.trailCursor=Math.max(0,h.trailCursor-1);}
  for(const [i,h] of this.heroes.entries()){
   if(h.dead){h.dead=false;h.hp=h.maxHp*.35;}h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.07*dt);if(i===0)continue;
   const end=this.travel.length?Math.max(0,this.trail.length-1-i*2):this.trail.length-1;h.trailCursor=Math.min(h.trailCursor,end);while(h.trailCursor<end&&dist(h,this.trail[h.trailCursor])<5)h.trailCursor++;const p=this.trail[h.trailCursor];this.move(h,p,RULES.followSpeed*(dist(h,leader)>90?1.5:1),dt,false);h.state='跟随';
  }
  if(this.dungeon==='ruby'&&dist(leader,n)>28){const extra=groups.find(g=>g.stage===n.stage&&!n.groups?.includes(g.id)&&g.members.some(m=>!this.killed.includes(m.id))&&dist(leader,g)<18);if(extra){this.phase='combat';this.travelEncounter=true;this.enemies=[];this.pulled=[];this.battleClock=0;this.engageClock=0;this.recoverPoint={x:leader.x,y:leader.y};this.wave={index:this.index,name:'途中引怪：'+extra.name,start:this.elapsed,time:0,deaths:[],missedInterrupts:0,hazardHits:0,extra:[extra.id]};this.spawnGroup(extra);this.addLog('途中额外引怪：'+extra.name);return;}}
  if(dist(leader,n)<5&&!this.travel.length&&this.alive().every(h=>dist(h,leader)<120)){this.recoverPoint={x:n.x,y:n.y};this.spawn();}
 }
 chooseTarget(h){const s=spec(h.id),tank=this.heroes[0],targets=this.targets().filter(e=>dist(e,tank)<RULES.leash);const priority=this.route[this.index].priority;return targets.sort((a,b)=>(b.npcId===Number(priority)?1:0)-(a.npcId===Number(priority)?1:0)||(b.cast?1:0)-(a.cast?1:0)||a.hp-b.hp)[0];}
 combat(dt){
  this.battleClock+=dt;this.engageClock+=dt;const n=this.route[this.index],tank=this.heroes[0];
  let pullDest=null;
  if(!this.travelEncounter&&this.dungeon==='ruby'&&n.groups?.length>this.mergeCursor){const g=group(n.groups[this.mergeCursor]);if(!this.mergeTravel?.length)this.mergeTravel=pathTo(this.dungeon,tank,g)||[g];pullDest=this.mergeTravel[0];if(dist(tank,pullDest)<5){this.mergeTravel.shift();pullDest=this.mergeTravel[0]||g;}if(dist(tank,g)<28){this.spawnGroup(g);this.mergeCursor++;this.mergeTravel=[];pullDest=null;this.addLog('拉入第二组：'+g.name);}}
  if(this.dungeon==='ruby')for(const g of groups)if(g.stage===n.stage&&!this.pulled.includes(g.id)&&g.members.some(m=>!this.killed.includes(m.id))&&this.alive().some(h=>dist(h,g)<18)){this.spawnGroup(g);this.wave.extra.push(g.id);this.addLog('额外引怪：'+g.name);}
  for(const [i,h] of this.heroes.entries()){
   if(h.dead)continue;const s=spec(h.id),target=this.chooseTarget(h);h.target=target?.id||null;
   const urgent=this.alive().slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
   const hazard=this.hazards.find(z=>z.life>0&&dist(h,z)<z.r+9);
   let destination=null;
   if(hazard){
    let best=null;for(let k=0;k<24;k++){const angle=k*Math.PI/12,p={x:hazard.x+Math.cos(angle)*(hazard.r+15),y:hazard.y+Math.sin(angle)*(hazard.r+15)};if(navigable(this.dungeon,p,35)&&!this.hazards.some(z=>dist(p,z)<z.r+5)&&(!best||dist(h,p)<dist(h,best)))best=p;}destination=best;h.state='躲避';
   }else if(i===0&&pullDest){destination=pullDest;h.state='拉入下一组';}
   else if(s.role==='heal'&&urgent&&urgent.hp<urgent.maxHp*.98&&!this.range(h,urgent,s.healRange*.85)){destination=urgent;h.state='接近治疗目标';}
   else if(target){
    const angle=Math.atan2(target.y-tank.y,target.x-tank.x),r=s.melee?(s.role==='tank'?12:13):s.attackRange*RULES.unitsPerYard*.6;
    const offset=s.role==='tank'?Math.PI:s.melee?(i%2?1:-1)*1.5:Math.PI+(i-2)*.28;
    const p={x:target.x+Math.cos(angle+offset)*r,y:target.y+Math.sin(angle+offset)*r};
    if(s.melee&&!this.range(h,target,s.attackRange)||!s.melee&&(dist(h,target)>s.attackRange*RULES.unitsPerYard*.85||dist(h,target)<35))destination=navigable(this.dungeon,p,35)?p:target;
    h.state=destination?'接近目标':'站定施法';
   }
   if(destination){let step=destination;if(!hazard&&dist(h,destination)>55){if(!h.approach?.length||!h.approachGoal||dist(h.approachGoal,destination)>35){h.approach=pathTo(this.dungeon,h,destination)||[destination];h.approachGoal={x:destination.x,y:destination.y};}while(h.approach.length>1&&dist(h,h.approach[0])<5)h.approach.shift();step=h.approach[0]||destination;}else h.approach=[];h.moving=this.move(h,step,hazard?100:RULES.moveSpeed,dt);if(!h.moving)h.approach=[];}
   if(!hazard&&!pullDest){for(const other of this.heroes){if(other===h||other.dead)continue;const d=dist(h,other);if(d>0&&d<RULES.separation){const p={x:h.x+(h.x-other.x)/d*(RULES.separation-d),y:h.y+(h.y-other.y)/d*(RULES.separation-d)};h.moving=this.move(h,p,20,dt)||h.moving;}}}
   if(i>0&&this.engageClock<1.5&&!this.targets().some(e=>(e.threat[tank.id]||0)>150)){h.state='等待坦克';continue;}
   if(hazard){if(h.cast)h.state='躲避 · 暂停读条';continue;}
   const casting=this.targets().filter(e=>e.cast?.interruptible&&this.range(h,e,s.interruptRange)).sort((a,b)=>(b.npcId===Number(n.priority)?1:0)-(a.npcId===Number(n.priority)?1:0)||a.cast.remaining-b.cast.remaining)[0];
   if(s.role!=='heal'&&casting&&h.interruptCd===0){casting.cast=null;h.interruptCd=s.melee?12:20;this.metrics.interrupts++;this.addLog(s.job+'打断 '+casting.name);}
   if(s.role==='tank'&&h.tauntCd===0){const loose=this.targets().find(e=>e.target!==h.id&&this.range(h,e,s.tauntRange));if(loose){loose.threat[h.id]=Math.max(0,...Object.values(loose.threat))+500;h.tauntCd=5;}}
   this.trinket(h,target);if(h.skillCd===0&&(s.role!=='dps'||this.burstAllowed()))this.skill(h,target);
   const healTarget=s.role==='heal'&&urgent?.hp<urgent?.maxHp*.98?urgent:null,actionTarget=healTarget||target;
   const range=healTarget?s.healRange:s.attackRange;
   if(!actionTarget)continue;
   if(!this.range(h,actionTarget,range)){h.rangeLost+=dt;h.state='超距 · 移动';continue;}
   h.uptime+=dt;
   if(h.attackCd===0){
    if(s.castTime>0){if(!h.cast)h.cast={target:actionTarget.id,heal:!!healTarget,remaining:interval(s.castTime,h.haste),total:interval(s.castTime,h.haste)};if(h.moving)continue;h.cast.remaining-=dt;if(h.cast.remaining>0)continue;const t=h.cast.heal?this.heroes.find(t=>t.id===h.cast.target):this.enemies.find(t=>t.id===h.cast.target);if(!t||!this.range(h,t,h.cast.heal?s.healRange:s.attackRange)){h.cast=null;continue;}if(h.cast.heal)this.heal(h,t,h.power*1.5);else this.damage(h,t,h.power*(s.role==='heal'?.45:1));h.cast=null;
    }else if(healTarget)this.heal(h,healTarget,h.power*1.5);else this.damage(h,target,h.power*(s.role==='heal'?.45:1));
    h.attackCd=interval(s.castTime? .2:RULES.attackInterval,h.haste);
   }
  }
  const scale=Math.pow(RULES.damageGrowth,this.level-2);
  for(const e of this.targets()){
   e.slow=Math.max(0,(e.slow||0)-dt);e.flash=Math.max(0,e.flash-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.castCd=Math.max(0,e.castCd-dt);const alive=this.alive();if(!alive.length)break;
   const t=alive.slice().sort((a,b)=>(e.threat[b.id]||0)-(e.threat[a.id]||0))[0];e.target=t.id;
   if(dist(e,t)>RULES.leash){e.cast=null;this.move(e,this.route[this.index],50,dt);continue;}
   const reach=e.kind==='caster'?30:5;if(!this.range(e,t,reach))this.move(e,t,(e.kind==='caster'?25:48)*(e.slow>0?.5:1),dt);else if(e.attackCd===0){this.hurt(t,(e.kind==='boss'?RULES.bossAttack:RULES.enemyAttack)*scale,e.name);e.attackCd=e.kind==='boss'?1.8:2.5;}
   if(e.cast){e.cast.remaining-=dt;if(e.cast.remaining<=0){if(e.cast.interruptible){const victim=alive.filter(h=>this.range(e,h,40)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(victim)this.hurt(victim,65*scale,e.name+'：危险法术');this.metrics.missedInterrupts++;this.wave.missedInterrupts++;}e.cast=null;}}
   if(e.castCd===0&&!e.cast){e.castCd=e.kind==='boss'?9:13;if(e.kind==='caster')e.cast={remaining:2,total:2,interruptible:true};if(e.kind==='boss'){e.cast={remaining:1.8,total:1.8,interruptible:false};this.bossMechanic(e);}}
  }
  for(const z of this.hazards){z.life-=dt;if(z.life<=0&&!z.resolved){z.resolved=true;for(const h of this.alive())if(dist(h,z)<z.r){this.hurt(h,z.damage*scale,z.label);this.metrics.hazardHits++;this.wave.hazardHits++;}else this.metrics.dodges++;}}this.hazards=this.hazards.filter(z=>z.life>0);
  if(this.heroes.every(h=>h.dead)){this.wipes++;this.closeWave();this.hazards=[];if(this.wipes>=RULES.maxWipes)this.finish(false,'连续三次团灭');else{this.phase='recovering';this.reviveTimer=RULES.revive;this.addLog('团灭，6 秒后重整；已击杀怪物不再出现');}return;}
  if(!this.targets().length&&(this.travelEncounter||!n.groups||this.mergeCursor>=n.groups.length)){if(this.travelEncounter){this.closeWave();this.travelEncounter=false;this.phase='walking';this.hazards=[];return;}this.closeWave();this.enemies=[];this.hazards=[];this.index++;this.travel=[];if(this.index>=this.route.length){const enough=this.dungeon!=='ruby'||this.forces>=RUBY_DATA.totalForces;this.finish(enough,enough?'所有首领与敌方进度已完成':'敌方进度不足');}else this.phase='walking';}
 }
 closeWave(){if(!this.wave)return;this.wave.time=this.elapsed-this.wave.start;this.waves.push(this.wave);this.wave=null;}
 bossMechanic(e){const alive=this.alive(),t=alive[Math.floor(this.random()*alive.length)];if(!t)return;this.hazards.push({x:t.x,y:t.y,r:24,life:1.8,max:1.8,damage:85,label:'首领危险区域',resolved:false});this.addLog(e.name+'施放危险区域');}
 loot(){const result=[],count=this.clock<=this.limit?3:2,tier=tierForLevel(this.level);for(let i=0;i<count;i++){const h=this.heroes[Math.floor(this.random()*5)],role=spec(h.id).role,slot=['weapon','armor','trinket'][Math.floor(this.random()*3)],effects=Object.keys(TRINKETS).filter(e=>TRINKETS[e].role===role);result.push(makeItem({id:`${this.id}-loot-${i}`,slot,role,tier,quality:this.random()<.2?'epic':this.random()<.5?'rare':'uncommon',effect:effects[Math.floor(this.random()*effects.length)],from:DUNGEONS.find(d=>d.id===this.dungeon).name}));}return result;}
 finish(success,reason){if(this.result)return;this.closeWave();const inTime=this.clock<=this.limit,upgrade=success&&inTime?(this.clock<this.limit*.65?3:this.clock<this.limit*.8?2:1):0;this.phase=success?'complete':'failed';this.result={rulesVersion:3,id:this.id,dungeon:this.dungeon,level:this.level,success,inTime,upgrade,time:this.elapsed,penalty:this.penalty,reason,metrics:{...this.metrics},waves:this.waves,forces:this.forces,heroes:this.heroes.map(h=>({id:h.id,damage:Math.round(h.damage),healing:Math.round(h.healing),overheal:Math.round(h.overheal),taken:Math.round(h.taken),rangeLost:h.rangeLost,uptime:h.uptime,casts:h.casts})),loot:success?this.loot():[],date:new Date().toISOString()};this.addLog(reason);}
 replaceFuture(plan){const nodes=compilePlan(plan);if(JSON.stringify(nodes.slice(0,this.index+1))!==JSON.stringify(this.nodes.slice(0,this.index+1)))throw Error('只能修改当前波次之后的路线');this.plan=JSON.parse(JSON.stringify(plan));this.nodes=nodes;}
 serialize(){return JSON.parse(JSON.stringify(this));}
 static restore(data){
  if(!data||data.version!==3||!validateTeam(data.heroes?.map(h=>h.id))||!DUNGEONS.some(d=>d.id===data.dungeon)||!Array.isArray(data.nodes)||data.nodes.length>100||data.index<0||data.index>data.nodes.length||JSON.stringify(data).length>2500000)throw Error('远征存档格式无效');
  for(const k of ['elapsed','level','seed','index','forces','penalty'])if(!Number.isFinite(data[k])||data[k]<0)throw Error('存档数值无效');
  for(const h of data.heroes)for(const k of ['x','y','hp','maxHp','power','armor','attackCd','skillCd','trinketCd'])if(!Number.isFinite(h[k]))throw Error('队员数据无效');
  if(!['walking','combat','recovering','complete','failed'].includes(data.phase)||!Number.isInteger(data.level)||data.level<2||data.level>20||!Number.isInteger(data.index)||typeof data.id!=='string'||!data.metrics)throw Error('远征状态无效');
  for(const key of ['enemies','hazards','effects','log','killed','pulled','waves','travel','trail'])if(!Array.isArray(data[key])||data[key].length>(key==='trail'?1000:500))throw Error('远征列表损坏');
  for(const n of data.nodes)if(!['trash','boss'].includes(n.kind)||!Number.isFinite(n.x)||!Number.isFinite(n.y))throw Error('路线损坏');
  for(const h of data.heroes){if(h.maxHp<=0||h.hp<0||h.hp>h.maxHp||h.armor<0||h.armor>=1||h.haste<0||h.haste>RULES.hasteCap||h.crit<0||h.crit>RULES.critCap)throw Error('队员属性损坏');if(h.cast&&(!Number.isFinite(h.cast.remaining)||!Number.isFinite(h.cast.total)))throw Error('读条损坏');}
  for(const e of data.enemies){for(const key of ['x','y','hp','maxHp','attackCd','castCd'])if(!Number.isFinite(e[key]))throw Error('敌人数据损坏');if(!e.threat||typeof e.threat!=='object')throw Error('仇恨数据损坏');}
  for(const z of data.hazards)for(const key of ['x','y','r','life','damage'])if(!Number.isFinite(z[key]))throw Error('危险区域数据损坏');
  if(data.dungeon==='ruby')compilePlan(data.plan);const r=Object.assign(Object.create(Run.prototype),JSON.parse(JSON.stringify(data)));r.paused=true;return r;
 }
}
