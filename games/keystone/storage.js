import {DEFAULT_TEAM,SLOTS,QUALITIES,validateTeam,spec,itemScore} from './data.js';
export const KEY='keystone-idle-v1',BAG_LIMIT=80;
export function fresh(){return {version:1,team:[...DEFAULT_TEAM],dungeon:'fangs',key:2,maxKey:2,bag:[],equipment:{},history:[],completed:[],runs:0,wins:0,settings:{repeat:false,speed:1},checkpoint:null};}
export function validateItem(item){return item&&typeof item.id==='string'&&SLOTS[item.slot]&&QUALITIES[item.quality]&&['all','tank','heal','dps'].includes(item.role)&&['ilvl','power','stamina','haste','crit'].every(k=>Number.isFinite(item[k])&&item[k]>=0)&&item.ilvl<=1000;}
export function load(storage){
 const result=fresh();try{const raw=JSON.parse(storage.getItem(KEY)||'null');if(!raw)return {profile:result,error:null};if(raw.version!==1)throw new Error('存档版本不支持');
 if(validateTeam(raw.team))result.team=raw.team;result.dungeon=typeof raw.dungeon==='string'?raw.dungeon:result.dungeon;
 result.maxKey=Math.max(2,Math.min(20,Number(raw.maxKey)||2));result.key=Math.max(2,Math.min(result.maxKey,Number(raw.key)||2));
 const bagIds=new Set();result.bag=(Array.isArray(raw.bag)?raw.bag:[]).filter(i=>{if(!validateItem(i)||bagIds.has(i.id))return false;bagIds.add(i.id);return true;}).slice(0,BAG_LIMIT);const used=new Set(result.bag.map(i=>i.id));
 if(raw.equipment&&typeof raw.equipment==='object')for(const [id,gear] of Object.entries(raw.equipment)){if(!spec(id)||!gear||typeof gear!=='object')continue;result.equipment[id]={};for(const [slot,item] of Object.entries(gear))if(validateItem(item)&&item.slot===slot&&!used.has(item.id)&&itemScore(item,id)>=0){result.equipment[id][slot]=item;used.add(item.id);}}
 result.completed=Array.isArray(raw.completed)?raw.completed.filter(x=>typeof x==='string').slice(-200):[];
 result.history=Array.isArray(raw.history)?raw.history.slice(0,12).filter(x=>x&&typeof x==='object'&&Number.isFinite(x.time)&&Number.isFinite(x.level)):[];
 result.runs=Math.max(0,Number(raw.runs)||0);result.wins=Math.max(0,Number(raw.wins)||0);result.settings={repeat:raw.settings?.repeat===true,speed:[1,2,3].includes(raw.settings?.speed)?raw.settings.speed:1};result.checkpoint=raw.checkpoint||null;
 return {profile:result,error:null};}catch(error){return {profile:result,error:'无法读取部分存档：'+error.message+'。原存档保留，保存新进度后会替换。'};}
}
export function save(storage,profile){try{storage.setItem(KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function equip(profile,id,itemId){
 if(!spec(id))return false;const index=profile.bag.findIndex(i=>i.id===itemId);if(index<0)return false;const item=profile.bag[index];if(itemScore(item,id)<0)return false;
 profile.equipment[id]||={};const old=profile.equipment[id][item.slot];profile.bag.splice(index,1);profile.equipment[id][item.slot]=item;if(old)profile.bag.push(old);return true;
}
export function autoEquip(profile,ids=profile.team){
 let changed=0;for(const id of ids){profile.equipment[id]||={};for(const slot of Object.keys(SLOTS)){const old=profile.equipment[id][slot];const best=profile.bag.filter(i=>i.slot===slot&&itemScore(i,id)>itemScore(old,id)).sort((a,b)=>itemScore(b,id)-itemScore(a,id))[0];if(best&&equip(profile,id,best.id))changed++;}}return changed;
}
export function settle(profile,result){
 if(profile.completed.includes(result.id))return false;
 if(profile.bag.length+(result.loot?.length||0)>BAG_LIMIT)return false;
 profile.completed.push(result.id);profile.completed=profile.completed.slice(-200);profile.runs++;if(result.success)profile.wins++;
 if(result.success&&result.inTime)profile.maxKey=Math.min(20,Math.max(profile.maxKey,result.level+result.upgrade));
 profile.bag.push(...(result.loot||[]));profile.history.unshift(result);profile.history=profile.history.slice(0,12);profile.checkpoint=null;return true;
}
