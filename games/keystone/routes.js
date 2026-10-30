import {getMap} from './maps.js';
import {RUBY_DATA} from './ruby-data.js';
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const groups=RUBY_DATA.groups;
export const group=id=>groups.find(g=>g.id===id);
export function defaultPlan(){
 let forces=0;const chosen=new Set();
 const efficient=groups.slice().sort((a,b)=>b.forces/b.members.length-a.forces/a.members.length||b.forces-a.forces);
 for(const g of efficient)if(forces<RUBY_DATA.totalForces){chosen.add(g.id);forces+=g.forces;}
 const plan=[];let cursor=getMap('ruby').entrance;
 for(let stage=0;stage<3;stage++){
  if(stage===1)cursor={x:630,y:190};
  const remaining=groups.filter(g=>g.stage===stage&&chosen.has(g.id));let count=0;
  while(remaining.length){remaining.sort((a,b)=>dist(cursor,a)-dist(cursor,b));const g=remaining.shift();plan.push({groups:[g.id],burst:count++%3===0,priority:null});cursor=g;}
  plan.push({boss:stage,groups:[],burst:true,priority:null});cursor=getMap('ruby').route.filter(n=>n.kind==='boss')[stage];
 }return plan;
}

export function validatePlan(plan){
 const errors=[],warnings=[],seen=new Set();let stage=0,forces=0;
 if(!Array.isArray(plan)||plan.length>80)return {valid:false,errors:['路线格式无效'],warnings,forces:0};
 for(const [i,p] of plan.entries()){
  if(p.boss!==undefined){if(p.boss!==stage)errors.push(`第 ${i+1} 波首领顺序或门槛错误`);stage++;continue;}
  if(!Array.isArray(p.groups)||p.groups.length<1||p.groups.length>2){errors.push(`第 ${i+1} 波请选择一至两组`);continue;}
  const gs=p.groups.map(group);if(gs.some(g=>!g)){errors.push('包含不存在的怪群');continue;}
  for(const g of gs){if(seen.has(g.id))errors.push('怪群重复：'+g.name);seen.add(g.id);forces+=g.forces;if(g.stage!==stage)errors.push(`第 ${i+1} 波跨越首领门槛`);}
  if(gs.length===2&&(gs[0].stage!==gs[1].stage||dist(gs[0],gs[1])>125))errors.push(`第 ${i+1} 波怪群距离过远，不能合并`);
 }
 if(stage!==3)errors.push('必须包含三位首领');if(forces<RUBY_DATA.totalForces)errors.push(`敌方进度不足：${(forces/RUBY_DATA.totalForces*100).toFixed(1)}%`);
 const nodes=compilePlan(plan,false);let previous=getMap('ruby').entrance;
 for(const n of nodes){const start=n.transport||previous,path=pathTo('ruby',start,n);if(!path)errors.push('路线存在不连通区域');let from=start;for(const to of path||[]){for(const g of groups){if(g.stage!==n.stage||seen.has(g.id))continue;if(segmentDistance(g,from,to)<18)warnings.push(`路径靠近未选择怪群 ${g.id}，可能额外引怪`);}from=to;}previous=n;}

 return {valid:!errors.length,errors:[...new Set(errors)],warnings:[...new Set(warnings)],forces};
}
export function compilePlan(plan,check=true){
 if(check){const v=validatePlan(plan);if(!v.valid)throw Error(v.errors.join('；'));}
 const map=getMap('ruby');let stage=0;
 const nodes=plan.map((p,i)=>{
  if(p.boss!==undefined){const n=map.route.filter(n=>n.kind==='boss')[p.boss];stage=p.boss+1;return {...n,via:[],stage:p.boss,planIndex:i,groups:[],burst:p.burst,priority:p.priority};}
  const gs=(p.groups||[]).map(group).filter(Boolean),g=gs[0]||groups[0];const n={x:g.x,y:g.y,via:[],kind:'trash',area:g.name,stage:g.stage,planIndex:i,groups:gs.map(g=>g.id),burst:p.burst,priority:p.priority};
  if(i>0&&stage===1&&plan[i-1]?.boss===0)n.transport={x:630,y:190,label:'乘坐龙骑前往红玉高台'};return n;
 });
 let previous=map.entrance;for(const n of nodes){const start=n.transport||previous;const path=pathTo('ruby',start,n);n.via=path?path.slice(0,-1):[];previous=n;}return nodes;
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return dist(p,{x:a.x+t*dx,y:a.y+t*dy});}
// Authored corridors form a navigation graph, with branch links to MDT pack centres.
export function navigation(id){
 const map=getMap(id),points=[{...map.entrance,stage:0}],edges=[];let stage=0,last=0;
 for(const n of map.route){if(n.transport){stage++;points.push({...n.transport,stage});last=points.length-1;}
  for(const p of [...n.via,n]){points.push({x:p.x,y:p.y,stage});edges.push([last,points.length-1]);last=points.length-1;}}
 if(id==='ruby')for(const g of groups){const area=g.stage===0?0:1;let best=-1;for(let i=0;i<points.length;i++)if(points[i].stage===area&&(best<0||dist(points[i],g)<dist(points[best],g)))best=i;if(best>=0){points.push({...g,stage:area});edges.push([best,points.length-1]);}}
 return {points,edges};
}
const navs=new Map();
export function pathTo(id,a,b){
 if(!navs.has(id))navs.set(id,navigation(id));const {points,edges}=navs.get(id);
 const attach=p=>{let best=null;for(const [u,v] of edges){const a=points[u],b=points[v],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),q={x:a.x+t*dx,y:a.y+t*dy};if(!best||dist(p,q)<best.distance)best={u,v,q,distance:dist(p,q)};}return best;};
 const start=attach(a),end=attach(b);if(!start||!end)return null;
 if(start.u===end.u&&start.v===end.v)return [start.q,end.q,{x:b.x,y:b.y}];
 const cost=points.map(()=>Infinity),prev=[];cost[start.u]=dist(start.q,points[start.u]);cost[start.v]=dist(start.q,points[start.v]);
 const open=new Set(points.map((_,i)=>i));while(open.size){let u=-1;for(const i of open)if(u<0||cost[i]<cost[u])u=i;if(cost[u]===Infinity)break;open.delete(u);for(const [x,y] of edges){const v=x===u?y:y===u?x:-1;if(v<0)continue;const c=cost[u]+dist(points[u],points[v]);if(c<cost[v]){cost[v]=c;prev[v]=u;}}}
 const finish=cost[end.u]+dist(points[end.u],end.q)<cost[end.v]+dist(points[end.v],end.q)?end.u:end.v;
 if(!Number.isFinite(cost[finish]))return null;const result=[end.q,{x:b.x,y:b.y}];let u=finish;while(u!==undefined){result.unshift({x:points[u].x,y:points[u].y});u=prev[u];}result.unshift(start.q);return result;

}
export function navigable(id,p,radius=32){if(!navs.has(id))navs.set(id,navigation(id));const n=navs.get(id);return n.edges.some(([a,b])=>segmentDistance(p,n.points[a],n.points[b])<radius);}

export function corridorDistance(id,p){if(!navs.has(id))navs.set(id,navigation(id));const n=navs.get(id);return Math.min(...n.edges.map(([a,b])=>segmentDistance(p,n.points[a],n.points[b])));}
