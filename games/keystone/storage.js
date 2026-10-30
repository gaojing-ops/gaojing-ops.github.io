import {DEFAULT_TEAM,SLOTS,QUALITIES,validateTeam,spec,itemScore} from './data.js';
import {makeItem,tierForLevel,TRINKETS} from './rules.js';
export const KEY='keystone-idle-v1',BAG_LIMIT=80,BACKUP_KEY='keystone-idle-before-v3';
export function fresh(){return {version:3,team:[...DEFAULT_TEAM],dungeon:'fangs',key:2,maxKey:2,bag:[],reserve:[],equipment:{},history:[],completed:[],runs:0,wins:0,noUpgrade:0,plans:{},settings:{repeat:false,speed:1},checkpoint:null};}
export function validateItem(i){return i&&typeof i.id==='string'&&SLOTS[i.slot]&&QUALITIES[i.quality]&&['all','tank','heal','dps'].includes(i.role)&&Number.isInteger(i.tier)&&i.tier>=0&&i.tier<=19&&Number.isFinite(i.multiplier)&&i.multiplier>=1&&i.multiplier<=1.05&&(i.slot!=='trinket'||!!TRINKETS[i.effect]);}
function migrate(raw){
 const p={...fresh(),...raw,version:3,bag:[],reserve:[],equipment:{},checkpoint:null,noUpgrade:0,plans:{}};
 const convert=i=>makeItem({id:i.id,slot:['head','chest','boots'].includes(i.slot)?'armor':i.slot,role:i.role,tier:Math.max(1,Math.min(19,Math.round(((i.ilvl||20)-20)/4)+1)),quality:QUALITIES[i.quality]?i.quality:'uncommon',from:i.from});
 const seen=new Set();for(const item of raw.bag||[]){if(!item?.id||seen.has(item.id)||!['weapon','head','chest','boots','trinket'].includes(item.slot))continue;seen.add(item.id);const i=convert(item);(p.bag.length<BAG_LIMIT?p.bag:p.reserve).push(i);}
 for(const [id,gear] of Object.entries(raw.equipment||{})){if(!spec(id))continue;p.equipment[id]={};for(const old of Object.values(gear)){if(!old?.id||seen.has(old.id))continue;seen.add(old.id);const i=convert(old),current=p.equipment[id][i.slot];if(!current||itemScore(i,id)>itemScore(current,id)){if(current)p.reserve.push(current);p.equipment[id][i.slot]=i;}else p.reserve.push(i);}}
 p.history=(p.history||[]).map(h=>({...h,legacy:true}));return p;
}
export function load(storage){
 const result=fresh();try{const text=storage.getItem(KEY),raw=JSON.parse(text||'null');if(!raw)return {profile:result,error:null};let source=raw,migrated=false;
 if(raw.version===1){if(!storage.getItem(BACKUP_KEY))storage.setItem(BACKUP_KEY,text);source=migrate(raw);migrated=true;}else if(raw.version!==3)throw Error('不支持的存档版本');
 if(validateTeam(source.team))result.team=source.team;result.dungeon=source.dungeon||'fangs';result.maxKey=Math.max(2,Math.min(20,Number(source.maxKey)||2));result.key=Math.max(2,Math.min(result.maxKey,Number(source.key)||2));
 const used=new Set(),valid=i=>{if(!validateItem(i)||used.has(i.id))return false;used.add(i.id);return true;};
 result.bag=(source.bag||[]).filter(valid).slice(0,BAG_LIMIT);result.reserve=(source.reserve||[]).filter(valid);
 for(const [id,gear] of Object.entries(source.equipment||{})){if(!spec(id))continue;result.equipment[id]={};for(const [slot,i] of Object.entries(gear||{}))if(SLOTS[slot]&&i?.slot===slot&&itemScore(i,id)>0&&valid(i))result.equipment[id][slot]=i;}
 for(const k of ['runs','wins','noUpgrade'])result[k]=Math.max(0,Number(source[k])||0);result.history=(source.history||[]).slice(0,12);result.completed=(source.completed||[]).filter(i=>typeof i==='string').slice(-200);result.plans=source.plans||{};result.checkpoint=source.checkpoint||null;result.settings={repeat:source.settings?.repeat===true,speed:[1,2,3].includes(source.settings?.speed)?source.settings.speed:1};
 if(migrated){storage.setItem(KEY,JSON.stringify(result));return {profile:result,error:'已迁移三部位装备；旧档已备份，多余护甲在迁移收纳区。旧远征请重新开始。'};}return {profile:result,error:null};
 }catch(e){return {profile:result,error:'读取或迁移未完成，原存档保留：'+e.message,readOnly:true};}
}
export function save(storage,p){try{storage.setItem(KEY,JSON.stringify(p));return true;}catch{return false;}}
export function equip(p,id,itemId){if(!spec(id))return false;const index=p.bag.findIndex(i=>i.id===itemId);if(index<0)return false;const item=p.bag[index];if(itemScore(item,id)<0)return false;p.equipment[id]||={};const old=p.equipment[id][item.slot];p.bag.splice(index,1);p.equipment[id][item.slot]=item;if(old)p.bag.push(old);return true;}
export function autoEquip(p,ids=p.team){let changed=0;for(const id of ids){p.equipment[id]||={};for(const slot of Object.keys(SLOTS)){const old=p.equipment[id][slot];const best=p.bag.filter(i=>i.slot===slot&&itemScore(i,id)>itemScore(old,id)&&(slot!=='trinket'||!old||i.effect===old.effect)).sort((a,b)=>itemScore(b,id)-itemScore(a,id))[0];if(best&&equip(p,id,best.id))changed++;}}return changed;}
export function claimReserve(p,id){if(p.bag.length>=BAG_LIMIT)return false;const i=p.reserve.findIndex(i=>i.id===id);if(i<0)return false;p.bag.push(p.reserve.splice(i,1)[0]);return true;}
export function settle(p,r){
 if(p.completed.includes(r.id)||p.bag.length+(r.loot?.length||0)>BAG_LIMIT)return false;
 if(r.success){const tier=tierForLevel(r.level),opportunities=p.team.flatMap(id=>['weapon','armor'].filter(slot=>(p.equipment[id]?.[slot]?.tier||0)<tier).map(slot=>({id,slot})));
  const upgrades=r.loot.some(i=>i.slot!=='trinket'&&p.team.some(id=>itemScore(i,id)>itemScore(p.equipment[id]?.[i.slot],id)));
  if(p.noUpgrade>=2&&!upgrades&&opportunities.length){const o=opportunities[0];r.loot[0]=makeItem({id:`${r.id}-guarantee`,slot:o.slot,role:spec(o.id).role,tier,from:'升级保底'});p.noUpgrade=0;}else p.noUpgrade=upgrades?0:p.noUpgrade+1;
 }
 p.completed.push(r.id);p.completed=p.completed.slice(-200);p.runs++;if(r.success)p.wins++;if(r.success&&r.inTime)p.maxKey=Math.min(20,Math.max(p.maxKey,r.level+r.upgrade));p.bag.push(...(r.loot||[]));p.history.unshift(r);p.history=p.history.slice(0,12);p.checkpoint=null;return true;
}
