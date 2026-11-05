// Follow a feasible recipe from carried weapons; never invent rewards or replace slots.
const { UNION_RECIPES } = require('./Evolution');
function fusionPlan(game) {
 const p=game.player,carried=p?.weapons||[],banned=game.upgradeSystem?.banishList||[];
 if(!p||game.curseSingleWeapon)return null;
 const routes=Object.entries(UNION_RECIPES).flatMap(([id,recipe])=>{
  if(carried.some(w=>w.id===recipe.resultId)||banned.includes('union_'+id))return [];
  const ids=[id,recipe.requireWeapon],held=ids.map(id=>carried.find(w=>w.id===id));
  if(!held.some(Boolean))return [];
  if(ids.some((id,i)=>!held[i]&&(banned.includes(id)||carried.length>=6)||held[i]&&held[i].level<held[i].def.maxLevel&&banned.includes(id)))return [];
  const score=held.filter(Boolean).length*100-carried.findIndex(w=>ids.includes(w.id));
  return [{id,recipe,ids,held,score}];
 });
 routes.sort((a,b)=>b.score-a.score);return routes[0]||null;
}
function fusionRole(option,plan) {
 if(!plan)return '';
 if(option.type==='evolve'&&option.isUnion&&option.weaponId===plan.id)return 'ready';
 if(option.type==='weapon_new'&&plan.ids.includes(option.id))return 'partner';
 if(option.type==='weapon_up'&&plan.ids.includes(option.id))return 'temper';
 return '';
}
module.exports={fusionPlan,fusionRole};
