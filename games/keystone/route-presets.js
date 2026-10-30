import {defaultPlan,group,dist} from './routes.js';

export const ROUTE_STYLES=[
 {id:'steady',name:'稳妥推进',tag:'推荐',description:'一组一组打，承伤压力较小。'},
 {id:'balanced',name:'适度合拉',tag:'熟悉后选',description:'部分相邻怪群一起打，兼顾节奏和压力。'},
 {id:'aggressive',name:'积极合拉',tag:'装备好再选',description:'尽量两组一起打，打断和治疗压力更高。'}
];

export function presetPlan(mode,{plan,locked=-1}={}){
 if(!ROUTE_STYLES.some(s=>s.id===mode))throw Error('请选择有效打法');
 const base=locked>=0?JSON.parse(JSON.stringify(plan)):defaultPlan();
 const prefix=base.slice(0,locked+1),remaining=base.slice(locked+1).flatMap(p=>p.boss!==undefined?[p]:p.groups.map(id=>({...p,groups:[id]})));
 const output=[...prefix];let merged=0;
 for(let i=0;i<remaining.length;i++){
  const p=remaining[i],next=remaining[i+1];
  const canMerge=mode!=='steady'&&p.boss===undefined&&next?.boss===undefined&&group(p.groups[0]).stage===group(next.groups[0]).stage&&dist(group(p.groups[0]),group(next.groups[0]))<=(mode==='balanced'?75:125);
  if(canMerge&&(mode==='aggressive'||merged++%2===0)){output.push({...p,groups:[p.groups[0],next.groups[0]],burst:true,priority:null});i++;}
  else output.push({...p,priority:null});
 }
 return output;
}
