// The eight surviving echoes of the gods. Run-local; never writes progression saves.
const DEITIES = {
 ember:{name:'烛照',title:'余火之神',color:'#efb36c',icon:'flame',verse:'诸神沉寂之后，他仍把最后一簇火留在人间。',gift:'伤害加成 +8 个百分点，攻击范围 +8%。',stats:{bonusMight:.08,bonusArea:.08}},
 wind:{name:'乘岚',title:'归途之神',color:'#add2ae',icon:'feather',verse:'循着羽声走，迷失在长夜里的人终能找到归途。',gift:'移动速度 +8%，闪避冷却缩短 10%。',stats:{bonusSpeed:.08},dash:.9},
 storm:{name:'震霄',title:'惊雷之神',color:'#f5dc92',icon:'lightning',verse:'当黑潮遮住群星，雷声便替守夜者回答。',gift:'对普通与精英敌人的暴击率 +4 个百分点，暴击倍率 +0.2。',stats:{luckyChance:.04,criticalDamage:.2}},
 moon:{name:'凝月',title:'霜夜之神',color:'#addce8',icon:'snow',verse:'她将月光凝成霜，留住火焰将熄前的那一刻。',gift:'护甲 +1，冻结持续时间 +15%。',stats:{bonusArmor:1,bonusFreezeDur:.15}},
 grove:{name:'青萝',title:'复苏之神',color:'#c2dc93',icon:'leaf',verse:'灰烬落进泥土的地方，总有新芽记得春天。',gift:'生命上限 +15，每秒恢复 0.2 生命。',stats:{bonusRegen:.2},health:15},
 night:{name:'玄瞳',title:'司夜之神',color:'#c7b5ef',icon:'eye',verse:'他的眼中藏着熄灭的群星，也藏着尚未抵达的路。',gift:'获得经验 +10%，拾取范围 +15%。',stats:{bonusXp:.1,bonusPickup:.15}},
 forge:{name:'余铸',title:'炉誓之神',color:'#edac87',icon:'hammer',verse:'以旧铁铸成灯架，以未冷的炉火铸成不退之誓。',gift:'护甲 +1，接触反伤比例 +10 个百分点。',stats:{bonusArmor:1,thornDamage:.1}},
 dawn:{name:'曦衡',title:'黎明之神',color:'#fff0b1',icon:'crown',verse:'黎明并非天赐，而是每一位守夜者借来的希望。',gift:'伤害加成 +4 个百分点，冷却缩减 +4 个百分点。',stats:{bonusMight:.04,bonusCdr:.04}},
};
const row=(deity,id,name,desc,stats={},extra={})=>({deity,id:'boon_'+id,name,desc,stats,maxRank:3,...extra});
const BLESSINGS=[
 row('ember','coal','余炭长明','每阶使伤害加成增加 6 个百分点。',{bonusMight:.06}),
 row('ember','wildfire','沿灯燎原','每阶使攻击范围增加 8%。',{bonusArea:.08}),
 row('ember','breath','余火吐息','每 5 秒灼烧周围 130 × 范围倍率内的敌人；每阶造成 12 × 伤害倍率的伤害。',{}, {pulse:'ember',interval:5}),
 row('wind','stride','归途轻履','每阶使移动速度增加 6%。',{bonusSpeed:.06}),
 row('wind','evade','借风一跃','每阶将闪避冷却再缩短 10%，最低 0.9 秒。',{}, {dash:.9}),
 row('wind','carry','风携余烬','每阶使拾取范围增加 15%、投射物速度增加 6%。',{bonusPickup:.15,bonusProjSpeed:.06}),
 row('storm','omen','惊雷之签','每阶使对普通与精英敌人的暴击率增加 4 个百分点。',{luckyChance:.04}),
 row('storm','edge','雷枝裂夜','每阶使对普通与精英敌人的暴击倍率增加 0.2。',{criticalDamage:.2}),
 row('storm','chain','鸣雷巡林','每 4 秒召雷，击中附近最多 3 名敌人；每阶造成 14 × 伤害倍率的伤害。',{}, {pulse:'storm',interval:4}),
 row('moon','mail','月下霜衣','每阶增加 1 护甲；每点护甲提供 8% 减伤，总减伤上限 60%。',{bonusArmor:1}),
 row('moon','still','留住月光','每阶使冻结持续时间增加 15%。',{bonusFreezeDur:.15}),
 row('moon','tide','霜月止潮','每 6 秒冻结周围 150 × 范围倍率内的普通敌人，每阶持续 0.6 秒，另受冻结时长加成；首领仅减速 1 秒。',{}, {pulse:'moon',interval:6}),
 row('grove','root','烬土新芽','每阶使生命上限增加 12，并恢复至多 12 生命。',{}, {health:12}),
 row('grove','sap','枝间回春','每阶增加每秒 0.25 生命恢复。',{bonusRegen:.25}),
 row('grove','thorn','春荆藏锋','每阶使毒素伤害增加 15%。',{bonusToxicDmg:.15}),
 row('night','lore','拾星成卷','每阶使获得的经验增加 8%。',{bonusXp:.08}),
 row('night','gather','群星引路','每阶使拾取范围增加 18%。',{bonusPickup:.18}),
 row('night','chant','星夜低吟','每阶使冷却缩减增加 3 个百分点；遵守武器 50%、咏誓 70% 上限。',{bonusCdr:.03}),
 row('forge','return','旧铁还誓','每阶使接触反伤比例增加 8 个百分点。',{thornDamage:.08}),
 row('forge','anvil','炉前不退','每阶增加 1 护甲；每点护甲提供 8% 减伤，总减伤上限 60%。',{bonusArmor:1}),
 row('forge','twins','双芯符灯','投射物数量增加 1。此赐福仅有一阶。',{bonusProjectile:1},{maxRank:1}),
 row('dawn','vigil','残灯续明','每阶使生命上限增加 10、恢复至多 10 生命，并增加每秒 0.1 生命恢复。',{bonusRegen:.1},{health:10}),
 row('dawn','promise','未至之晨','每阶使伤害加成增加 5 个百分点、冷却缩减增加 1 个百分点。',{bonusMight:.05,bonusCdr:.01}),
 row('dawn','bell','破晓钟声','每 8 秒恢复 2 × 阶数生命，并以晨光伤及周围 150 × 范围倍率内的敌人；每阶造成 10 × 伤害倍率的伤害。',{}, {pulse:'dawn',interval:8}),
];
function applyStats(game,def,opening=false){
 const p=game.player;for(const [key,value] of Object.entries(def.stats||{}))p[key]=(p[key]||0)+value;
 if(def.dash)p.dashMaxCooldown=Math.max(.9,p.dashMaxCooldown*def.dash);
 if(def.health){p.maxHp+=def.health;if(opening){p.hp=Math.min(p.maxHp,p.hp+def.health);}else if(!game.curseNoHeal){const healed=Math.min(def.health,p.maxHp-p.hp);p.hp+=healed;p.totalHealed+=healed;}}
}
class Pantheon{
 constructor(game,id){this.game=game;this.patron=Object.hasOwn(DEITIES,id)?id:null;this.ranks={};this.timers={};this.effects=[];if(this.patron)applyStats(game,DEITIES[id],true);}
 offer(banished=[]){
  const pool=BLESSINGS.filter(b=>(this.ranks[b.id]||0)<b.maxRank&&!banished.includes(b.id));if(!pool.length||!this.patron)return null;
  const kin=pool.filter(b=>b.deity===this.patron),choices=kin.length&&Math.random()<.5?kin:pool;
  const def=choices[Math.floor(Math.random()*choices.length)],rank=(this.ranks[def.id]||0)+1;
  return {type:'blessing',id:def.id,deity:def.deity,name:def.name,desc:def.desc,color:DEITIES[def.deity].color,rank,rarity:'rare'};
 }
 grant(option){
  if(!option)return false;
  const def=BLESSINGS.find(b=>b.id===option.id);if(!def||option.type!=='blessing'||option.rank!==(this.ranks[def.id]||0)+1||option.rank>def.maxRank)return false;
  this.ranks[def.id]=option.rank;applyStats(this.game,def);if(def.pulse&&this.timers[def.id]===undefined)this.timers[def.id]=def.interval;
  const p=this.game.player;this.effects.push({kind:'vow',deity:def.deity,x:p.x,y:p.y,age:0,life:1.2,radius:65});this.effects=this.effects.slice(-20);return true;
 }
 update(dt){
  const g=this.game;if(!g.isRunning||g.isPaused||g._runSettled)return;
  this.effects=this.effects.filter(e=>(e.age+=dt)<e.life);
  for(const def of BLESSINGS){if(!def.pulse||!this.ranks[def.id])continue;this.timers[def.id]-=dt;
   if(this.timers[def.id]<=0){this.timers[def.id]+=def.interval;this.pulse(def,this.ranks[def.id]);}
  }
 }
 pulse(def,rank){
  const g=this.game,p=g.player,kind=def.pulse,radius=(kind==='ember'?130:kind==='storm'?420:150)*p.area;
  const targets=[...g.enemies,...g.bosses].filter(e=>e.active&&Math.hypot(e.x-p.x,e.y-p.y)<=radius).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
  const hits=kind==='storm'?targets.slice(0,3):targets;
  const effect={kind,deity:def.deity,x:p.x,y:p.y,radius,age:0,life:kind==='moon'?1:.8,points:hits.map(e=>({x:e.x,y:e.y}))};
  for(const target of hits){
   if(kind==='moon'){
    if(g.bosses.includes(target)){target.slowed=Math.max(target.slowed||0,1);target.slowAmount=.6;}
    else target.frozen=Math.max(target.frozen||0,.6*rank*(1+(p.bonusFreezeDur||0)));
   }else target.takeDamage((kind==='ember'?12:kind==='storm'?14:10)*rank*p.might,def.id);
  }
  if(kind==='dawn'&&!g.curseNoHeal){const healed=Math.max(0,Math.min(p.maxHp-p.hp,rank*2));p.hp+=healed;p.totalHealed+=healed;}
  this.effects.push(effect);this.effects=this.effects.slice(-20);
 }
}
module.exports={DEITIES,BLESSINGS,Pantheon};
