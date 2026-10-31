import {entry,text,ELEMENT_NAMES,registerLore,TRAITS,damageSource} from './lore.mjs';
import {installWebHUD} from './theme.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>Number(value||0).toLocaleString('zh-CN',{maximumFractionDigits:1});
const time=value=>typeof value==='string'?value:`${String(Math.floor((value||0)/60)).padStart(2,'0')}:${String(Math.floor((value||0)%60)).padStart(2,'0')}`;
const TYPES={weapon_new:'新获武器',weapon_up:'磨砺武器',passive:'护符',evolve:'武器觉醒',relic:'古老遗物',heal:'回春赐福'};
export function optionCopy(option,catalogs,game=null){
 if(option.type==='blessing'){const preview=game?catalogs.pantheon.blessingPreview(game,option):null;const god=catalogs.pantheon?.DEITIES[option.deity];return {name:option.name,desc:option.desc,detail:`${god?.name||'诸神'} · ${god?.title||'余烬神息'} · 第 ${option.rank} 阶${preview?'\n'+[...preview.lines,...preview.warnings].join('\n'):''}`,tag:'神明赐福'};}
 const kind=option.type==='evolve'?'evolution':option.type==='passive'?'passives':option.type==='relic'?'relics':'weapons';
  const copy=entry(kind,option.id,catalogs[kind]?.[option.id]||option);
 return {name:option.type==='heal'?'回春赐福':copy.name,desc:['weapon_up','passive','heal'].includes(option.type)?text(option.desc):copy.desc||text(option.desc),detail:option.type==='evolve'&&option.desc?.includes('融合')?text(option.desc):text(option.synergy||''),tag:TYPES[option.type]||'旅途馈赠'};
}
export function chooseUpgrade(scene,option){
 if(scene.manager&&scene.manager.currentScene!==scene)return false;
 if(!scene.options.includes(option))return false;
 if(scene.banishMode){if(scene.banishCount<=0)return false;scene.onBanish?.(option);scene.banishMode=false;}
 else scene.onSelect?.(option);
 return true;
}

export function createFolio(runtime,platform,hooks={}){
 if(!runtime.catalogs)return {sync:()=>false,get visible(){return false;}};
 const {game,sm,canvas,catalogs:c,SFX,art}=runtime;
 c.curses=runtime.CURSE_DEFS;registerLore(c);installWebHUD(runtime);
 const root=document.createElement('section');root.id='web-folio';root.className='web-folio';root.hidden=true;root.setAttribute('aria-label','守夜者手札');
 canvas.parentElement.before(root);
 let key='',previous='',active=false,tab='',query='',message='',actions=[],renders=0;
 const reset=()=>{key='';hooks.afterAction?.();};
 function act(fn){const id=String(actions.length);actions.push(fn);return id;}
 function button(label,fn,disabled=false,style=''){return `<button type="button" class="folio-button ${style}" data-action="${act(fn)}" ${disabled?'disabled':''}>${esc(label)}</button>`;}
 const badge=label=>`<span class="folio-badge">${esc(label)}</span>`;
 const icon=(id='rune')=>`<canvas class="folio-icon" width="96" height="96" data-icon="${esc(id)}" aria-hidden="true"></canvas>`;
 const godPortrait=id=>{const i=Object.keys(c.pantheon?.DEITIES||{}).indexOf(id);return `<span class="god-art" style="--god-x:${i%4*100/3}%;--god-y:${i<4?0:100}%" aria-hidden="true"></span>`;};
 const note=label=>`<p class="folio-note">${esc(label)}</p>`;
 function card(title,description,extra='',action='',meta='',media='',state=''){
  return `<article class="folio-card ${esc(state)}">${media||icon('rune')}<div class="folio-card-body">${meta?`<div class="folio-card-meta">${meta}</div>`:''}<h3>${esc(title)}</h3><p>${esc(description)}</p>${extra}</div>${action?`<div class="folio-card-action">${action}</div>`:''}</article>`;
 }
 const grid=content=>`<div class="folio-grid">${content}</div>`;
 function stats(rows){return `<dl class="folio-stats">${rows.map(([label,value])=>{
  const hp=label==='生命'?String(value).match(/^([\d.]+)\s*\/\s*([\d.]+)$/):null;
  const ratio=hp?Math.max(0,Math.min(1,Number(hp[1])/Math.max(1,Number(hp[2])))):0;
  const bar=hp?`<span class="folio-health-track ${ratio<.3?'is-low':''}" aria-hidden="true"><span style="width:${ratio*100}%"></span></span>`:'';
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}${bar}</dd></div>`;
 }).join('')}</dl>`;}

 function tabs(rows){return `<nav class="folio-tabs" aria-label="手札分类">${rows.map(([id,label])=>`<button type="button" data-action="${act(()=>{tab=id;query='';message='';})}" aria-pressed="${tab===id}">${esc(label)}</button>`).join('')}</nav>`;}
 function header(kicker,title,description,back=true){return `<header class="folio-header"><div><span class="folio-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(description)}</p></div>${back?button('返回营地 ↗',()=>sm.switchTo('title'),false,'quiet'):''}</header>`;}
 function portrait(kind,id,skin=''){return `<canvas class="folio-portrait" width="120" height="120" data-portrait="${esc(id)}" data-skin="${esc(skin)}" data-kind="${kind}" aria-hidden="true"></canvas>`;}
 const loadout=weapons=>`<div class="folio-loadout">${weapons.map(w=>{
  // Original result records contain names and levels, without weapon IDs.
  const id=w.id||Object.keys(c.weapons).find(id=>[entry('weapons',id,c.weapons[id]).name,entry('evolution',id,c.evolution[id]||{}).name].includes(text(w.name)));
  return `<span>${icon(id)}<span>${esc(text(w.name||entry(w.evolved?'evolution':'weapons',id,w.def||w).name))}<small>第 ${w.level||1} 级</small></span></span>`;
 }).join('')}</div>`;
 function watchBanner(kicker,title,description,media=icon('lantern')){return `<div class="folio-watch">${media}<div><span class="folio-kicker">${esc(kicker)}</span><h3>${esc(title)}</h3><p>${esc(description)}</p></div></div>`;}
 const rewardIcon=r=>({weapon_evolve:'crown',full_heal:'heart',damage_boost:'sword',cdr_boost:'hourglass',armor_boost:'shield',speed_boost:'feather',xp_boost:'book',pickup_boost:'bell',area_boost:'ring',gem_rain:'crystal'})[r.id]||(/生命|修复|恢复|回血/.test(r.name)?'heart':/冷却/.test(r.name)?'hourglass':/甲|护盾/.test(r.name)?'shield':/速/.test(r.name)?'feather':/经验/.test(r.name)?'book':/武器|进化/.test(r.name)?'sword':'lantern');
 function search(){return `<label class="folio-search"><span>查阅手札</span><input type="search" data-search placeholder="输入名称或效果" value="${esc(query)}" aria-label="查找图鉴"></label>`;}
 function visible(copy){return !query||(copy.name+copy.desc).includes(query);}
 function codex(){
  if(!tab)tab='heroes';
  let body=header('THE WATCHER’S CODEX','守夜者手札','记下林中的敌影，也记下能照亮归途的每一簇火。');
  body+=tabs([['heroes','守夜者'],...(c.pantheon?[['gods','余烬诸神']]:[]),['weapons','武器'],['evolution','觉醒'],['passives','护符'],['relics','遗物'],['enemies','敌影'],['bosses','首领'],['events','林间际遇']])+search();
  let rows='';
  if(tab==='gods')return body+grid(Object.entries(c.pantheon.DEITIES).map(([id,god])=>{if(!visible({name:god.name,desc:god.title+god.gift+god.verse+c.pantheon.BLESSINGS.filter(b=>b.deity===id).map(b=>b.name+b.desc).join('')}))return '';return card(god.name+' · '+god.title,god.verse,`<p class="folio-values">开局祈誓：${esc(god.gift)}</p>${c.pantheon.BLESSINGS.filter(b=>b.deity===id).map(b=>`<div class="folio-rule"><strong>${esc(b.name)} · 最高 ${b.maxRank} 阶</strong><p>${esc(b.desc)}</p></div>`).join('')}`,'',badge('余烬诸神'),godPortrait(id));}).join(''));
  if(tab==='heroes')for(const [id,hero] of Object.entries(c.characters)){
   const skill=entry('skills',id,c.skills[id]),copy={name:hero.name,desc:skill.desc};if(!visible(copy))continue;
   rows+=card(hero.name,text(hero.desc),`<div class="folio-rule"><strong>天生特性</strong><p>${esc(TRAITS[id]||text(hero.passive))}</p></div><div class="folio-rule"><strong>${esc(skill.name)} <small>· 咏誓 · ${c.skills[id].cooldown} 秒冷却</small></strong><p>${esc(skill.desc)}</p></div>`, '',badge(`${hero.stats.maxHp} 生命`)+badge(`${hero.stats.speed} 移速`),portrait('hero',id));
  }
  else if(tab==='bosses')c.bosses.forEach((boss,i)=>{
   const copy={name:boss.name,desc:bossLore[i]};if(!visible(copy))return;
   rows+=card(copy.name,copy.desc,`<div class="folio-tags">${boss.skills.map(id=>badge(bossSkills[id]||'暗夜咒术')).join('')}</div>`,'',badge(`基础生命 ${fmt(boss.baseHp)}`),portrait('boss',i));
  });
  else if(tab==='enemies')for(const [id,def] of Object.entries(c.enemies)){
   const copy=entry('enemies',id,def);if(!visible(copy))continue;
   rows+=card(copy.name,copy.desc,'','',badge('黑潮生物'),portrait('enemy',id));
  }
  else for(const [id,def] of Object.entries(c[tab]||{})){
   const copy=entry(tab,id,def);if(!visible(copy))continue;
   let extra='',meta=badge(ELEMENT_NAMES[def.element]||({passives:'随身护符',relics:'旅途遗物',evolution:'觉醒武器'})[tab]||'武器');
   if(tab==='weapons'){
    if(def.baseDamage!==undefined)extra+=`<p class="folio-values">基础伤害 ${def.baseDamage} · 基础间隔 ${def.baseCooldown} 秒</p>`;
    if(c.evolution[id]){const target=entry('evolution',id,c.evolution[id]);extra+=`<details><summary>觉醒之途 · ${esc(target.name)}</summary><p>武器满级，并持有「${esc(entry('passives',c.evolution[id].requirePassive,c.passives[c.evolution[id].requirePassive]).name)}」。${esc(condition(c.evolution[id].unlockCondition))}；拾取觉醒之石也可解锁。</p><p>${esc(target.desc)}</p></details>`;}
   }else if(tab==='evolution')extra=`<p class="folio-values">${esc(entry('weapons',id,c.weapons[id]).name)} ＋ ${esc(entry('passives',def.requirePassive,c.passives[def.requirePassive]).name)}</p>${note(condition(def.unlockCondition))}`;
   rows+=card(copy.name,copy.desc,extra,'',meta,icon(id));
  }
  return body+grid(rows||'<p class="folio-empty">手札中暂未找到这段记载。</p>');
 }
 function growth(){
  if(!tab)tab='oaths';const meta=game.meta;
  let body=header('KEEP THE EMBERS','余烬之庭',`把带回的 ${fmt(meta.data.chips)} 枚余烬，留给下一段长夜。`);
  body+=tabs([['oaths','誓印'],['talents','誓途'],['skins','灯色'],['pets','旅伴'],['auras','足下灯纹']]);let rows='';
  if(tab==='oaths')for(const def of c.meta){
   const copy=entry('meta',def.id,def),level=meta.getLevel(def.id),cost=meta.getCost(def),max=level>=def.maxLevel;
   rows+=card(copy.name,copy.desc,'',button(max?'誓印已圆满':`铭刻 · ${fmt(cost)} 余烬`,()=>{meta.purchase(def);},max||meta.data.chips<cost),badge(`${level} / ${def.maxLevel} 阶`),icon(def.id),max?'is-owned':'');
  }
  else if(tab==='talents'){
   if(!sm.scenes.shop.talentTree)sm.scenes.shop.talentTree=new c.talents.TalentTree(meta);
   const tree=sm.scenes.shop.talentTree;
   for(const branch of c.talents.TALENT_BRANCHES){
    rows+=`<section class="folio-branch"><h3>${({power:'燃刃之途',skill:'流风之途',survival:'长生之途'})[branch.id]}</h3><div class="folio-talent-grid">`;
    for(const node of branch.nodes){const copy=entry('talents',node.id,node),allocated=tree.isAllocated(node.id),req=Array.isArray(node.req)?node.req:node.req?[node.req]:[];
     rows+=card(copy.name,copy.desc,req.length?note('前誓：'+req.map(id=>entry('talents',id,c.talents.NODE_MAP[id]).name).join('、')):'',button(allocated?'已铭刻':`${node.cost} 余烬`,()=>tree.allocate(node.id),allocated||!tree.canAllocate(node.id)),badge(allocated?'誓印已成':'等待铭刻'),icon(node.id));}
    rows+='</div></section>';
   }
   body+=note('重整誓途需 100 余烬，退还已花费余烬的 50%。')+button('重整誓途',()=>{tree.reset();},meta.data.chips<100,'quiet');
   return body+`<div class="folio-branches">${rows}</div>`;
  }
  else if(tab==='skins')for(const [charId,skins] of Object.entries(c.skins))for(const skin of skins){
   const copy=entry('skins',skin.id,skin),owned=skin.cost===0||meta.isSkinUnlocked(skin.id),selected=(meta.getSelectedSkin(charId)||skins[0].id)===skin.id;
   rows+=card(copy.name,copy.desc,note(c.characters[charId].name),button(selected?'正在佩用':owned?'佩用灯色':`${fmt(skin.cost)} 余烬`,()=>{if(owned||meta.purchaseSkin(skin.id,skin.cost))meta.selectSkin(charId,skin.id);},selected||!owned&&meta.data.chips<skin.cost),badge(owned?'已收藏':'待收藏'),portrait('hero',charId,skin.id),selected?'is-selected':owned?'is-owned':'');
  }
  else if(tab==='pets'){
   const all=Object.keys(c.pets).every(id=>meta.isPetUnlocked(id));
   body+=`<div class="folio-banner"><div><h3>林间相逢</h3><p>花费 1,000 余烬，遇见一位尚未结识的旅伴。最多携带两位同行。</p>${sm.scenes.shop.lastDrawnPet?note('新结识：'+text(sm.scenes.shop.lastDrawnPet.name)):''}</div>${button(all?'旅伴已全部结识':'寻访旅伴 · 1,000 余烬',()=>sm.scenes.shop._handleDrawPet(meta),all||meta.data.chips<1000)}</div>`;
   for(const [id,def] of Object.entries(c.pets)){const copy=entry('pets',id,def),owned=meta.isPetUnlocked(id),equipped=meta.isPetEquipped(id);
    rows+=card(copy.name,copy.desc,'',button(equipped?'留在营地':owned?'邀请同行':'尚未相逢',()=>{if(equipped)meta.unequipPet(id);else if(!meta.equipPet(id))message='最多可带两位旅伴同行。';},!owned||!equipped&&(meta.data.equippedPets?.length||0)>=2),badge(equipped?'同行中':owned?'已结识':'林间寻访'),icon(id),equipped?'is-selected':owned?'is-owned':'');}
  }
  else if(tab==='auras'){
   body+=note('灯纹只改变外观，不提供战斗加成。')+button('收起灯纹',()=>meta.selectAura(null),!meta.data.selectedAura,'quiet');
   for(const [id,def] of Object.entries(c.auras)){const copy=entry('auras',id,def),owned=meta.isAuraUnlocked(id),selected=meta.data.selectedAura===id;
    rows+=card(copy.name,copy.desc,'',button(selected?'正在佩用':owned?'佩用灯纹':`${fmt(def.cost)} 余烬`,()=>{if(owned||meta.purchaseAura(id,def.cost))meta.selectAura(id);},selected||!owned&&meta.data.chips<def.cost),badge(owned?'已收藏':'待收藏'),icon('ring'),selected?'is-selected':owned?'is-owned':'');}
  }
  return body+grid(rows);
 }
 function upgrades(scene){
  let body=header(scene.chestMode?'A GIFT IN THE ASHES':'LET THE EMBER GROW',scene.chestMode?'余烬中的馈赠':scene.banishMode?'舍去一条命途':'让火光再盛一分',scene.banishMode?'选中的强化将不再出现在本次远征中。':'长夜暂歇。选一份力量，再踏入林间。',false);
  body+=`<div class="folio-choice-label"><span>01 / 选择馈赠</span><span>THE EMBER’S GIFT</span></div>`;
  body+=grid(scene.options.map((option,i)=>{const copy=optionCopy(option,c,game);return card(copy.name,copy.desc,copy.detail?note(copy.detail):'',button(scene.banishMode?'放逐此项':`选择 ${i+1} ↗`,()=>chooseUpgrade(scene,option)),badge(copy.tag)+badge(({rare:'稀有',epic:'史诗',legendary:'传说'})[option.rarity]||''),icon(option.type==='blessing'?'god_'+option.deity:option.type==='heal'?'heart':option.type==='chest_gold'?'coin':option.type==='chest_heal'?'heart':option.id),'is-choice' );}).join(''));
  if(scene.previews.length)body+=`<details class="folio-preview"><summary>前路可期 · ${scene.previews.length} 条觉醒之途</summary>${grid(scene.previews.map(o=>card(text(o.name),text(o.desc),'','','',icon(o.id))).join(''))}</details>`;
  if(!scene.chestMode)body+=`<div class="folio-actions">${button(`重问命途 · ${scene.rerollCount}`,()=>scene.onReroll?.(),scene.rerollCount<=0)}${button(`暂辞馈赠 · ${scene.skipCount}`,()=>scene.onSkip?.(),scene.skipCount<=0)}${button(scene.banishMode?'取消放逐':`放逐命签 · ${scene.banishCount}`,()=>{scene.banishMode=!scene.banishMode;},scene.banishCount<=0&&!scene.banishMode)}${button(`随缘强化：${game.autoUpgrade?'开':'关'}`,()=>{game.autoUpgrade=!game.autoUpgrade;})}</div>`;
  return body;
 }
 function pause(){
  if(!tab)tab='journey';const p=game.player;
  let body=header('REST BESIDE THE FLAME','在火光旁，歇一会儿。','时间停在这一刻。准备好时，再继续这段旅程。',false);
  body+=tabs([['journey','远征'],['equipment','随身行装'],['damage','锋芒记录'],['attributes','当前属性'],['settings','行旅设置'],...(game.pantheon?.patron?[['blessings','祈誓与神赐']]:[])]);
  if(tab==='journey')body+=watchBanner('YOUR WATCHER',c.characters[p.characterId]?.name||'守夜者','火光仍在，林间的时间为你停驻。',portrait('hero',p.characterId))+stats([['守夜时长',time(game.time)],['击败敌人',fmt(p.kills)],['当前阶位',p.level],['生命',`${Math.ceil(p.hp)} / ${p.maxHp}`]])+`<div class="folio-actions">${button('继续守夜 ↗',()=>hooks.togglePause?.(),false,'primary')}${button(`随行走位：${game.autoPlay?'开':'关'}`,()=>{game.autoPlay=!game.autoPlay;game._aiTimer=0;game._aiVector=null;})}${button(`随缘强化：${game.autoUpgrade?'开':'关'}`,()=>{game.autoUpgrade=!game.autoUpgrade;})}${button('结束本次远征',()=>game.endGame(),false,'quiet')}</div>`;
  else if(tab==='equipment'){
   const skill=entry('skills',p.characterId,c.skills[p.characterId]);body+=card(skill.name,skill.desc,note('角色咏誓 · 冷却 '+c.skills[p.characterId].cooldown+' 秒'),'','',icon('skill_'+p.characterId));
   body+=grid(p.weapons.map(w=>{const copy=entry(w.evolved?'evolution':'weapons',w.id,w.def);return card(copy.name,copy.desc,note(`伤害 ${w.damage} · 间隔 ${Number(w.interval).toFixed(2)} 秒`),'',badge(`第 ${w.level} 级`)+badge(w.evolved?'已觉醒':'武器'),icon(w.id));}).join('')+(p.passives||[]).map(p=>{const copy=entry('passives',p.id,c.passives[p.id]);return card(copy.name,copy.desc,'','',badge(`第 ${p.level} 级`)+badge('护符'),icon(p.id));}).join('')+(p.relics||[]).map(r=>{const id=typeof r==='string'?r:r.id,copy=entry('relics',id,c.relics[id]);return card(copy.name,copy.desc,'','',badge('遗物'),icon(id));}).join(''));
   const slots=c.builds.PRESET_BUILDS.filter(b=>b.isCustom);body+=`<div class="folio-actions">${slots.map(slot=>button(`记下此套行装 · ${slot.id.replace('custom','')}`,()=>{c.builds.BuildPreset.saveCustomBuild(slot.id,p,game.meta);message='已记入行装手札，下次启程可沿用。';})).join('')}</div>`;
  }else if(tab==='attributes')body+=note('以下为当前实际属性，已计入神誓、行装、临时增益、伤害递减及减伤/冷却上限。')+stats([
   ['实际伤害倍率','×'+fmt(p.might)],['实际减伤',fmt(p.armor*100)+'%'],['移动速度',fmt(p.speed)],['范围倍率','×'+fmt(p.area)],['武器冷却缩减',fmt(p.cdr*100)+'% / 50%'],['咏誓冷却缩减',fmt(Math.min(.7,p.bonusCdr||0)*100)+'% / 70%'],['闪避冷却',fmt(p.dashMaxCooldown)+' 秒'],['每秒恢复',(game.curseNoHeal||p.relicFlags?.overloadCore)?'禁疗中':fmt(p.regen)],['拾取半径',fmt(p.pickup)],['经验加成',fmt((p.bonusXp||0)*100)+'%'],['普通敌人暴击率',fmt(Math.min(1,p.luckyChance||0)*100)+'%'],['普通敌人暴击倍率','×'+fmt(2+(p.criticalDamage||0))],['额外投射物','+'+p.bonusProjectile],['接触反伤比例',fmt((p.thornDamage||0)*100)+'%']]);
  else if(tab==='damage'){
   const rows=Object.entries(game._weaponDamageStats||{}).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]),total=rows.reduce((n,[,v])=>n+v,0);
   body+=stats([['总伤害',fmt(total)],['每秒伤害',fmt(total/Math.max(1,game.time))]])+(rows.length?grid(rows.map(([id,value])=>card(damageSource(id,c).name,`${fmt(value)} 伤害 · 占比 ${(value/total*100).toFixed(1)}%`,`<meter aria-label="${esc(damageSource(id,c).name)}伤害占比" min="0" max="${total}" value="${value}"></meter>`,'','',icon(damageSource(id,c).icon))).join('')):'<p class="folio-empty">尚未留下伤敌的记录。</p>');
  }else if(tab==='blessings')body+=divineRecord();
  else body+=grid(card('营地之声','切换行旅中的音乐与音效。','',button(SFX.isMuted?'音效：关':'音效：开',()=>{SFX.toggleMute();game._saveSettings?.();}),'',icon('bell'))+card('林间光影','低画质会减少场景中的部分特效。','',button((game.qualityLevel||0)>=.8?'光影：精细':'光影：简约',()=>{game.qualityLevel=(game.qualityLevel||0)>=.8?0:1;game._saveSettings?.();}),'',icon('eye')));
  if(tab==='journey')body+=note(game.autoPlay&&game.autoUpgrade?'挂机已就绪：继续守夜后，切换窗口或标签页将继续战斗。手动暂停仍然有效。':'同时开启随行走位与随缘强化，即可在切屏后继续战斗。');
  return body;
 }

 function divineRecord(){
  const oath=game.pantheon,god=c.pantheon?.DEITIES[oath?.patron];if(!god)return '';
  return watchBanner('AN OATH AGAINST THE NIGHT',god.name+' · '+god.title,god.gift,godPortrait(oath.patron))+grid(c.pantheon.BLESSINGS.filter(b=>oath.ranks[b.id]).map(b=>{const rank=oath.ranks[b.id],m=oath.metrics[b.id],v=b.pulse?c.pantheon.pulseValues(game,b,rank):null;return card(b.name,b.desc,(v?note(`当前神息「${v.stage.name}」· 半径 ${fmt(v.radius)}`+(v.damage?` · 每目标基准伤害 ${fmt(v.damage)}`:'')+(v.targets?` · 最多 ${v.targets} 目标`:'')+(v.freeze?` · 冻结 ${fmt(v.freeze)} 秒`:'')+(v.healing?` · 每次最多恢复 ${fmt(v.healing)}`:'')):'')+(m?note(`已触发 ${m.casts} 次 · 命中 ${m.hits} 次 · 实际伤害 ${fmt(m.damage)} · 恢复 ${fmt(m.healing)}`):''),'',badge(c.pantheon.DEITIES[b.deity].name)+badge(`第 ${rank} / ${b.maxRank} 阶`),icon('god_'+b.deity));}).join(''))+note('神息在第 20、40、60 阶成长，周期伤害与晨光治疗最高达到基础值的 2.5 倍，连雷最多 6 目标；不会放大护甲、冷却等上限属性。')+note('祈誓与神赐只在本次远征生效；伤害加成遵守现有递减公式，恢复效果受禁疗试炼限制。');
 }
 function achievements(){return header('MARKS OF THE LONG NIGHT','长夜铭记','每一次坚持，都在营地里留下一道刻痕。')+grid(c.achievements.map(def=>{const copy=entry('achievements',def.id,def),unlocked=game.achievements.isUnlocked(def.id);return card(copy.name,copy.desc,'','',badge(unlocked?'已铭记':'尚待完成'),icon('crown'),unlocked?'is-owned':'');}).join(''));}
 function records(){const d=game.meta.data;return header('THE ROADS YOU HAVE WALKED','远征旧卷','记在这台设备里的归途，仍在等你续写。')+stats([['远征次数',fmt(d.totalRuns)],['最多击败',fmt(d.bestKills)],['最长守夜',time(d.bestTime)],['最高阶位',d.bestLevel||1],['累计击败',fmt(d.totalKills)],['累计时长',time(d.totalPlayTime)],['留存余烬',fmt(d.chips)],['首领连战',`${d.bossRushBestWave||0} / 10 波`]])+note('旧卷保存在当前浏览器中。')+button('查阅长夜铭记 ↗',()=>sm.switchTo('achievements'));}
 function daily(scene){const conf=scene.config,hero=c.characters[conf.charId];return header('TODAY’S WATCH','今日守夜','同一日，同一条路。以今日指定的行装，留下你的足迹。')+stats([['今日守夜者',hero?.name||'守夜者'],['前往之地',text(conf.mapStyle)],['今日路签',conf.seed],...(c.pantheon?[['本次祈誓',c.pantheon.DEITIES[game.selectedPatron]?.name||'烛照']]:[])])+grid((conf.curses||[]).map(def=>{const copy=entry('curses',def.id,def);return card(copy.name,copy.desc);}).join(''))+`<div class="folio-actions">${button(scene.alreadyPlayed?'再次赴约 ↗':'赴今日之约 ↗',()=>scene.onStart?.(conf),false,'primary')}</div>`+note(scene.alreadyPlayed?'今日已留下记录，仍可再次踏入这段旅程。':'今日还没有你的足迹。')+stats((scene.leaderboard||[]).map((r,i)=>[`第 ${i+1} 次记录`,`${r.time} · 击败 ${r.kills} · 第 ${r.level} 阶`]));}
 function speed(scene){return header('RUN BEFORE THE DAWN','疾行试炼',`尽快击败 ${c.speed.KILL_TARGET} 名敌人，让黎明追上你的脚步。`)+`<div class="folio-banner"><div><h3>以速度，写下新的归途。</h3><p>沿用守夜者的武器与成长规则，以完成目标的用时记录本次试炼。</p></div>${button('选择守夜者 ↗',()=>scene.onStart?.(),false,'primary')}</div>`+stats((scene.records||[]).map((r,i)=>[`第 ${i+1} 段归途`,`${c.speed.formatTime(r.timeMs??r.time??0)} · ${c.characters[r.charId]?.name||text(r.charName||'守夜者')}`]));}
 function result(scene){const d=scene.data||{},speed=!!d.speedRun;return header('UNTIL THE NEXT WATCH',speed?'疾行已成，灯火正盛。':d.endlessMode?'长夜仍有回声':d.victory?'黎明，终于到了。':'灯火暂歇，归途尚在。',speed?`已达成击败 ${c.speed.KILL_TARGET} 名敌人的疾行目标。本次成绩已记入疾行旧卷。`:d.victory?'你把火光带过了整片长夜。':'把余烬带回营地，下一次再走得远一些。',false)+watchBanner(d.victory?'DAWN HAS COME':'THE FIRE WILL RETURN',c.characters[game.player?.characterId]?.name||'守夜者',`带回 ${fmt(d.chips)} 枚余烬 · 每一次归来，都为下次点灯。`,portrait('hero',game.player?.characterId||'tracer'))+stats([[speed?'疾行用时':'守夜时长',d.time||'00:00'],['击败敌人',fmt(d.kills)],['最终阶位',d.level||1],['最高连击',d.highestCombo||0],['造成伤害',fmt(d.totalDamage)],['恢复生命',fmt(d.totalHealed)],['拾得经验',fmt(d.totalXp)],['带回余烬',`+${fmt(d.chips)}`]])+loadout(d.weapons||[])+divineRecord()+((d.newAchievements||[]).length?note('新刻痕：'+d.newAchievements.map(a=>entry('achievements',a.id,a).name).join('、')):'')+`<div class="folio-actions">${button('再赴长夜 ↗',()=>sm.switchTo('charSelect'),false,'primary')}${speed?button('查阅疾行纪录 ↗',()=>sm.switchTo('speedRun')):''}${d.victory&&!d.endlessMode&&!speed?button('继续无尽守夜',()=>game.enterEndlessMode()):''}${button('前往余烬之庭',()=>sm.switchTo('shop'))}${button('返回营地',()=>sm.switchTo('title'))}${button('分享归途',()=>platform.api.shareAppMessage({title:`长夜余烬 · 守夜 ${d.time||'00:00'}，击败 ${d.kills||0} 名敌人。`}))}</div>`;}
 function rewards(mode){const stage=mode==='stage',system=stage?game.stageSystem:game.bossRushMode;return header('A MOMENT BEFORE THE ROAD','拾一簇新火，再向前。',stage?'这一章已走过。选一份赐福，迎接下一段长夜。':'强敌已退。带上一份赐福，准备下一场交锋。',false)+grid(system.rewardOptions.map((r,i)=>card(text(r.name),text(r.desc),'',button('收下赐福 ↗',()=>stage?system.applyReward(i):system.selectReward(i)),badge(`馈赠 ${i+1}`),icon(rewardIcon(r)),'is-choice')).join(''));}
 function bossResult(){const b=game.bossRushMode;return header('THE LAST CHALLENGER',b.state==='complete'?'十道敌影，尽归长夜。':'此番止步，来日再战。','首领连战的这一页，已写入你的旧卷。',false)+divineRecord()+stats([['完成波数',`${b.currentWave} / 10`],['总用时',time(b.totalTime)],['获得余烬',b.finalChips||0],['评价',b.finalRank||'—']])+button('返回营地 ↗',()=>{game.input.clearInterceptor();game.bossRushMode=null;game.isRunning=false;sm.switchTo('title');},false,'primary');}
 function builds(scene){return header('PACK FOR THE LONG NIGHT','沿用一套行装','把熟悉的器物带在身边，再出发。')+grid(c.builds.PRESET_BUILDS.map(def=>{const copy=entry('builds',def.id,def),unlocked=def.isCustom||c.builds.BuildPreset._checkUnlock(def.unlockCondition,game.meta),loaded=c.builds.BuildPreset.loadCustomBuild(def.id,game.meta);return card(copy.name,copy.desc,note((loaded.startWeapons||[]).map(id=>entry('weapons',id,c.weapons[id]).name).join(' · ')),button(unlocked?'携此启程 ↗':text(c.builds.BuildPreset.getUnlockConditionText(def,game.meta)),()=>scene._handleCardTap(def),!unlocked));}).join(''));}
 function mode(){
  if(game.bossRushMode&&['complete','failed'].includes(game.bossRushMode.state))return 'bossResult';
  if(game.stageSystem?.state==='reward')return 'stageReward';
  if(game.bossRushMode?.state==='reward')return 'bossReward';
  if(sm.currentSceneName==='playing'&&game.isPaused)return 'pause';
  if(sm.currentSceneName==='playing'&&game._tutorialStep>=0)return 'tutorial';
  return ['compendium','shop','achievements','leaderboard','daily','speedRun','gameOver','upgrade','buildSelect'].includes(sm.currentSceneName)?sm.currentSceneName:'';
 }
 function render(name){
  actions=[];const scene=sm.currentScene;let html;
  if(name==='compendium')html=codex();else if(name==='shop')html=growth();else if(name==='upgrade')html=upgrades(scene);else if(name==='pause')html=pause();
  else if(name==='achievements')html=achievements();else if(name==='leaderboard')html=records();else if(name==='daily')html=daily(scene);else if(name==='speedRun')html=speed(scene);else if(name==='gameOver')html=result(scene);else if(name==='stageReward'||name==='bossReward')html=rewards(name==='stageReward'?'stage':'boss');else if(name==='bossResult')html=bossResult();else if(name==='buildSelect')html=builds(scene);
  else html=header('YOUR FIRST WATCH','带着火光，向前。','拖动屏幕或使用 WASD 移动。武器自动攻击，空格闪避，E 释放咏誓。',false)+button('我已准备好 ↗',()=>{for(let i=0;i<3&&game._tutorialStep>=0;i++)game._advanceTutorial();},false,'primary');
  root.setAttribute('data-view',name);root.setAttribute('aria-label',({shop:'余烬之庭',upgrade:'选择强化',pause:'远征暂停',gameOver:'远征结算',stageReward:'章节赐福',bossReward:'连战赐福',bossResult:'连战结算',compendium:'守夜者手札',achievements:'长夜铭记',leaderboard:'远征旧卷',daily:'今日守夜',speedRun:'疾行试炼',buildSelect:'行装手札',tutorial:'初次守夜'})[name]||'守夜者手札');
  root.innerHTML=`<canvas class="folio-ornament" width="72" height="72" data-icon="lantern" aria-hidden="true"></canvas>${html}${message?`<p class="folio-message" role="status">${esc(message)}</p>`:''}<footer class="folio-footer">火光未熄，归途仍在。<span>EMBERFALL</span></footer>`;
  const generation=++renders,currentActions=actions;
  for(const b of root.querySelectorAll('[data-action]'))b.addEventListener('click',()=>{if(b.disabled||generation!==renders||root.hidden)return;message='';currentActions[Number(b.dataset.action)]?.();reset();});
  const input=root.querySelector('[data-search]');input?.addEventListener('input',()=>{query=input.value;key='';});
  for(const image of root.querySelectorAll('[data-icon]'))art.drawIcon?.(image.getContext('2d'),image.dataset.icon,5,5,image.width-10);
  for(const image of root.querySelectorAll('[data-portrait]')){
   const ctx=image.getContext('2d'),id=image.dataset.portrait;ctx.globalAlpha=1;
   if(image.dataset.kind==='hero')art.drawPortrait(ctx,id,5,2,110,image.dataset.skin||undefined);
   else if(image.dataset.kind==='enemy')art.drawMonster(ctx,{type:id,x:60,y:68,radius:27,game:{time:0,player:{x:0}}});
   else art.drawBoss(ctx,{artIndex:Number(id),x:60,y:68,radius:30,game:{time:0,player:{x:0}}});
  }
 }
 return {
  sync(campVisible=false){
   const name=campVisible?'':mode();active=!!name;root.hidden=!active;canvas.parentElement.hidden=active;document.getElementById('game-shell').classList.toggle('has-folio',active);
   if(!active){if(previous&&sm.currentSceneName==='playing'&&game.isRunning&&!campVisible)document.getElementById('game-shell')?.scrollIntoView?.({block:'start',behavior:'instant'});key='';previous='';return false;}
   const entering=previous!==name;if(entering){tab='';query='';message='';previous=name;}
   const scene=sm.currentScene,signature=JSON.stringify([name,tab,query,game.autoUpgrade,game.autoPlay,SFX.isMuted,game.qualityLevel,scene?.options,scene?.banishMode,game.meta?.data,game.bossRushMode?.state,game.stageSystem?.state,scene?.data]);
   if(signature!==key){
    const focus=root.contains(document.activeElement)&&document.activeElement?.matches?.('[data-search]');const caret=focus?document.activeElement.selectionStart:null;
    const top=root.scrollTop;render(name);root.scrollTop=top;key=signature;if(entering)document.getElementById('game-shell')?.scrollIntoView?.({block:'start',behavior:'instant'});
    if(focus){const input=root.querySelector('[data-search]');input?.focus({preventScroll:true});try{input?.setSelectionRange(caret,caret);}catch{}}
   }
   return true;
  },get visible(){return active;},get renders(){return renders;}
 };
}
function condition(c){if(!c)return '另需满足觉醒条件';return ({kills:`本局击败 ${c.count} 名敌人`,healed:`本局恢复 ${c.count} 生命`,gemsCollected:`本局收集 ${c.count} 颗经验结晶`,frozenKills:`本局击败 ${c.count} 名冻结敌人`,poisonKills:`本局以毒击败 ${c.count} 名敌人`,bossKills:`本局击败 ${c.count} 名首领`})[c.type]||'完成对应的觉醒试炼';}
const bossLore=['熔心孕出的破坏者，以冲锋与大范围焰浪逼近。留心地面预兆，持续寻找空隙。','幽渊中缓步而来的巨影，召来仆从并放出暗潮。及时清理追兵，避开它的重击。','多首古兽以火柱与雷域封锁场地。不要在落焰与横扫天光之间停留。','披着霜冠的巨兽，以冰浪、暴风雪和冻结困住来者。尽量保留转身的余地。','腐根深处的母巢，散布毒雨与疫云。绕开被污染的地面，持续移动。','不稳定的星蚀之门，交替使用移形、裂隙与影军。以地面预兆判断下一次袭击。','遗迹中的重甲统帅，以雷网、星焰与护盾维持阵地。耐心等待防护的间隙。','兼用寒霜、雷域与冲锋的深渊守卫。留心技能接续时重新出现的安全区域。','藏身夜色的猎杀者，以移形、影军与飞刃扰乱判断。留心它突进后的落点。','血月下的古老领主，以血池与汲取生命延续战斗。避开血池，及时处理召来的暮蝠。'];
const bossSkills={charge:'踏地冲锋',nova:'焰浪迸发',bulletHell:'万矢之雨',gravitySuck:'深井牵引',dash:'疾影突刺',shockwave:'裂地波',crescentBlast:'弦月斩',mineField:'埋焰阵',deathRay:'终夜天光',summon:'唤来仆从',slam:'沉岩重击',spiralBurst:'旋咒飞矢',darkPulse:'暗潮回响',deathMark:'凋零烙印',poisonOrbs:'毒珠环',tripleChase:'三影追猎',flameColumn:'焰柱',electricField:'雷域',laserSweep:'天光横扫',scatter:'碎矢扇',iceWave:'霜浪',shatter:'碎冰',blizzard:'暴风雪',instantFreeze:'凝霜',poisonRain:'腐雨',plagueCloud:'疫云',mutation:'异生',decay:'凋萎',timeWarp:'迟暮之刻',teleportStorm:'移影风暴',voidRift:'幽渊裂隙',cloneArmy:'暮影成军',laserGrid:'雷光罗网',missileBarrage:'流星焰雨',shieldWall:'古盾壁',overcharge:'燃誓',carpetBombing:'燎原焰雨',shadowStrike:'折影斩',shurikenSprink:'散叶飞刃',bloodPool:'血月池',lifeDrain:'汲魂',bloodBeam:'绯月光',summonBats:'唤来暮蝠'};
