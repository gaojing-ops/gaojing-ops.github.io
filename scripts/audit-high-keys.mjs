import {Run} from '../games/keystone/engine.js';
import {DEFAULT_TEAM,DUNGEONS,SPECS,spec} from '../games/keystone/data.js';
import {RULES,makeItem} from '../games/keystone/rules.js';
import {presetPlan} from '../games/keystone/route-presets.js';
import {Worker,isMainThread,parentPort,workerData,threadId} from 'node:worker_threads';
import fs from 'node:fs';
const TEAMS={mixed:DEFAULT_TEAM,melee:['paladin-prot','priest-holy','warrior-arms','rogue-subtlety','warrior-fury'],ranged:['dk-blood','shaman-resto','mage-frost','warlock-demo','evoker-dev']};
function gear(team,tier,effect,armorTier=tier){if(tier<0)return {};return Object.fromEntries(team.map(id=>[id,Object.fromEntries(['weapon','armor','trinket'].map(slot=>[slot,makeItem({id:id+slot,slot,role:spec(id).role,tier:slot==='armor'?armorTier:tier,effect:spec(id).role==='tank'?'shield':spec(id).role==='heal'?'rescue':effect})]))]));}
function simulate(c){const r=new Run({team:c.ids,dungeon:c.dungeon,level:c.level,equipment:gear(c.ids,c.tier,c.effect,c.armorTier??c.tier),seed:c.seed,plan:c.dungeon==='ruby'?presetPlan(c.style):undefined});while(!r.result)r.update(.04);return {...c,success:r.result.success,inTime:r.result.inTime,time:+r.clock.toFixed(2),deaths:r.metrics.deaths,missedInterrupts:r.metrics.missedInterrupts,reason:r.result.reason};}
if(isMainThread&&process.argv.includes('--armor-only')){const rows=[0,9,18].map(armorTier=>simulate({tag:'armor',ids:TEAMS.ranged,dungeon:'ruby',level:20,tier:18,armorTier,style:'aggressive',effect:'cleave',seed:123}));fs.writeFileSync(new URL('../reports/high-key-armor.json',import.meta.url),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.map(r=>({armorTier:r.armorTier,time:r.time,deaths:r.deaths,inTime:r.inTime})),null,2));}
else if(!isMainThread){const rows=[];for(const c of workerData){rows.push(simulate(c));if(rows.length%25===0)parentPort.postMessage({progress:rows.length,thread:threadId});}parentPort.postMessage({rows});}
else{
 const unique=new Map();function add(c){const item={style:'steady',effect:'single',seed:123,...c,ids:c.ids||TEAMS[c.team||'mixed']};const key=JSON.stringify([item.dungeon,item.level,item.ids,item.tier,item.style,item.effect,item.seed]);if(unique.has(key))unique.get(key).tags.push(c.tag);else unique.set(key,{...item,tags:[c.tag]});}
 for(const d of DUNGEONS)for(let level=2;level<=20;level++)add({tag:'ladder',dungeon:d.id,level,team:'mixed',tier:level===2?-1:level-2});
 for(const d of DUNGEONS)for(const level of [10,15,20])for(const team of Object.keys(TEAMS))for(const seed of [1,42,123])add({tag:'grid',dungeon:d.id,level,team,tier:level-2,seed});
 for(const s of SPECS){const ids=[...DEFAULT_TEAM];ids[s.role==='tank'?0:s.role==='heal'?1:2]=s.id;if(new Set(ids).size!==5)continue;add({tag:'spec',dungeon:'ruby',level:20,ids,tier:18,style:'balanced',seed:42,specialization:s.id});}
 for(const team of Object.keys(TEAMS))for(const style of ['steady','balanced','aggressive'])for(const effect of ['single','cleave'])add({tag:'build',dungeon:'ruby',level:20,team,tier:18,style,effect});
 for(const tier of [0,4,9,14,18])for(const seed of [42,123])add({tag:'gear',dungeon:'ruby',level:20,team:'mixed',tier,style:'balanced',seed});
 for(const d of DUNGEONS)add({tag:'undergeared',dungeon:d.id,level:20,team:'mixed',tier:4});
 const cases=[...unique.values()],chunks=Array.from({length:4},()=>[]);cases.forEach((c,i)=>chunks[i%4].push(c));console.error('High-key cases:',cases.length);
 const results=(await Promise.all(chunks.map(cases=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:cases});w.on('message',m=>{if(m.rows)resolve(m.rows);else console.error('progress',m.thread,m.progress);});w.on('error',reject);w.on('exit',code=>{if(code)reject(Error('worker failure'));});})))).flat();
 const byTag=t=>results.filter(r=>r.tags.includes(t)),ladder=byTag('ladder'),high=byTag('grid').filter(r=>r.level===20),specializations=byTag('spec'),poor=byTag('undergeared');
 const failures=[];for(const r of ladder)if(!r.success||!r.inTime)failures.push('ladder '+r.dungeon+' +'+r.level);
 for(const r of specializations)if(!r.success||!r.inTime)failures.push('specialization '+r.specialization);
 for(const d of DUNGEONS)for(const seed of [1,42,123])if(high.filter(r=>r.dungeon===d.id&&r.seed===seed&&r.success&&r.inTime).length<2)failures.push('not enough viable teams '+d.id+' '+seed);
 for(const seed of [42,123]){const rows=byTag('gear').filter(r=>r.seed===seed),low=rows.find(r=>r.tier===4),full=rows.find(r=>r.tier===18);if(!full.success||!full.inTime||full.time>=low.time*.8)failures.push('gear improvement '+seed);}
 if(poor.filter(r=>!r.success||!r.inTime).length<4)failures.push('undergeared teams are too strong');
 const summary={runs:results.length,ladder:{runs:ladder.length,timed:ladder.filter(r=>r.success&&r.inTime).length},high20:{runs:high.length,timed:high.filter(r=>r.success&&r.inTime).length,min:Math.min(...high.map(r=>r.time)),max:Math.max(...high.map(r=>r.time))},specializations:{runs:specializations.length,timed:specializations.filter(r=>r.success&&r.inTime).length},undergeared:{runs:poor.length,timed:poor.filter(r=>r.success&&r.inTime).length},failures};
 fs.writeFileSync(new URL('../reports/high-key-balance.json',import.meta.url),JSON.stringify({hpGrowth:RULES.hpGrowth,damageGrowth:RULES.damageGrowth,equipmentQuality:'uncommon',equipmentAccess:'previous-floor loot tier; no purple gear or future-floor items',summary,cases:results},null,2));console.log(JSON.stringify(summary,null,2));if(failures.length)process.exitCode=1;
}
