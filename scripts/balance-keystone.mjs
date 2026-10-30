import {Run} from '../games/keystone/engine.js';
import {DEFAULT_TEAM,DUNGEONS,SPECS} from '../games/keystone/data.js';
import {makeItem} from '../games/keystone/rules.js';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import fs from 'node:fs';
const simulate=o=>{const r=new Run({team:DEFAULT_TEAM,seed:123,...o});while(!r.result)r.update(.04);return r;};
const gear=(team,tier)=>Object.fromEntries(team.map(id=>[id,Object.fromEntries(['weapon','armor'].map(slot=>[slot,makeItem({id:id+slot,slot,tier})]))]));
if(!isMainThread){const dungeon=workerData,report={starter:null,levels:[]};let wins=0;const times=[];
 for(let seed=1;seed<=100;seed++){const r=simulate({dungeon,seed});wins+=r.result.success;times.push(r.elapsed);}times.sort((a,b)=>a-b);report.starter={dungeon,wins,median:Math.round(times[50]),min:Math.round(times[0]),max:Math.round(times.at(-1))};
 for(const level of [2,5,10,15,20])for(const geared of [false,true]){const r=simulate({dungeon,level,equipment:geared?gear(DEFAULT_TEAM,level-1):{}});report.levels.push({dungeon,level,geared,win:r.result.success,time:Math.round(r.elapsed),deaths:r.metrics.deaths});}parentPort.postMessage(report);
}else{
 const report={starter:[],levels:[],specs:[]};const queue=DUNGEONS.map(d=>d.id);
 async function lane(){while(queue.length){const id=queue.shift();const r=await new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:id});w.on('message',resolve);w.on('error',reject);w.on('exit',code=>{if(code)reject(Error('simulation worker failed'));});});report.starter.push(r.starter);report.levels.push(...r.levels);console.error(id,JSON.stringify(r.starter));}}
 await Promise.all(Array.from({length:4},lane));
 for(const s of SPECS){const team=[...DEFAULT_TEAM];team[s.role==='tank'?0:s.role==='heal'?1:2]=s.id;if(new Set(team).size!==5)continue;for(const level of [2,5]){const r=simulate({team,dungeon:'ruby',level,equipment:gear(team,level-1)});report.specs.push({id:s.id,level,win:r.result.success,time:Math.round(r.elapsed),damage:Math.round(r.heroes.find(h=>h.id===s.id).damage),deaths:r.metrics.deaths});}}
 fs.writeFileSync(new URL('../balance-report.json',import.meta.url),JSON.stringify(report,null,2));console.log('Balance report saved; runs:',800+80+report.specs.length);
 if(report.starter.some(s=>s.wins<95)||report.specs.some(s=>!s.win))process.exitCode=1;
}
