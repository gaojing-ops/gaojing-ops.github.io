// All combat distances use atlas units; camera zoom never changes these rules.
export const RULES={unitsPerYard:3,hpGrowth:1.08,damageGrowth:1.06,limit:480,hardLimit:720,hasteCap:.25,critCap:.30,critMultiplier:1.5,deathPenalty:5,revive:6,maxWipes:3,moveSpeed:65,followSpeed:100,separation:15,leash:135,attackInterval:1.2,enemyAttack:16,bossAttack:42,trashHp:900,rubyTrashHp:220,bossHp:11500};
export const TRINKETS={
 shield:{name:'守护屏障',role:'tank',cooldown:24,description:'生命低于 45% 时获得最大生命 25% 的护盾，持续 6 秒'},
 recover:{name:'复苏之息',role:'tank',cooldown:22,description:'生命低于 60% 时恢复最大生命 20%'},
 rescue:{name:'黎明救援',role:'heal',cooldown:20,description:'队友生命低于 40% 时额外施放一次强效治疗'},
 renewal:{name:'回响之泉',role:'heal',cooldown:24,description:'至少两名队友生命低于 75% 时施放范围治疗'},
 single:{name:'决胜印记',role:'dps',cooldown:25,description:'攻击当前目标，造成 5 倍强度伤害'},
 cleave:{name:'风暴徽记',role:'dps',cooldown:25,description:'攻击目标附近的敌人，造成 2.2 倍强度范围伤害'}
};
export const tierForLevel=l=>Math.max(1,Math.min(19,l-1));
export const aoeFactor=i=>i<5?1:i<10?.3:0;
export const interval=(base,haste)=>base/(1+Math.min(RULES.hasteCap,haste));
export function combatProfile(s){
 const melee=s.role==='tank'||['战士','潜行者','恶魔猎手'].includes(s.job);
 return {melee,attackRange:melee?5:s.job==='唤魔师'?25:40,healRange:40,interruptRange:melee?5:30,tauntRange:30,areaRadius:10,castTime:!melee&&['法师','术士','萨满祭司','唤魔师'].includes(s.job)?1:0,skillCooldown:s.role==='tank'?10:s.role==='heal'?8:12};
}
export function makeItem({id,slot,role='all',tier=1,quality='uncommon',effect,from='远征战利品'}){
 tier=Math.max(0,Math.min(19,tier));const multiplier=quality==='epic'?1.05:quality==='rare'?1.025:1;
 effect=slot==='trinket'?(effect||({tank:'shield',heal:'rescue',dps:'single',all:'recover'}[role])):null;
 return {id,slot,role,tier,quality,effect,ilvl:20+tier*4,name:slot==='weapon'?'远征武器':slot==='armor'?'远征护甲':TRINKETS[effect].name,power:0,stamina:0,haste:0,crit:0,multiplier,from};
}
