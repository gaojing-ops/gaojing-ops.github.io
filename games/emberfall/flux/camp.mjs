import {entry,text as loreText,TRAITS} from './lore.mjs';
import {createGame as createCampBackdrop} from '../game.js';

const HERO_COPY={tracer:['以火为刃，守住最后的光','提灯穿过暗林，让每一颗余烬燃起希望。'],gunner:['穿行暗林，箭随风至','让利箭找到黑暗中的破绽，循着风声，等候黎明。'],walker:['不退半步，便是黎明','以坚实的身躯抵住黑潮，为反击守住一线火光。'],cryomancer:['霜落无声，月照归途','以寒霜凝住逼近的暗影，给长夜留下一道银白。'],biohazard:['枯枝生息，暗沼逢春','草木也有自己的锋芒，让毒枝在黑潮中蔓生。'],berserker:['以刃破晓，向夜而行','紧握双刃，踏过围猎，把黎明从长夜中夺回。'],arcane:['星火未熄，长夜有光','循着星辰的微光，让散落的力量在掌心相逢。'],engineer:['巧手为灯，铜火长明','用旧铜与符文筑起守望，陪火光走得更远。'],assassin:['暮色藏锋，影落无声','隐入暗林，掠过围猎，把锋芒留给最后一刻。']};

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// The web camp owns presentation and selection; the original scene callbacks start combat.
export function createCamp(runtime,platform,afterAction=()=>{}){
 const root=document.getElementById('camp-view');
 if(!root?.querySelector||!runtime.art)return {sync:()=>false,destroy(){}};
 const {game,sm,CHARACTERS,art}=runtime;
 const play=document.getElementById('play-view'),background=document.getElementById('camp-background');
 const heroes=root.querySelector('#camp-heroes'),description=root.querySelector('#camp-description');
 const name=root.querySelector('#camp-hero-name'),summary=root.querySelector('#camp-hero-stats');
 const curseList=root.querySelector('#camp-curses'),start=root.querySelector('#camp-start');
 const modeButtons=[...root.querySelectorAll('[data-run-mode]')];
 let selected=Object.keys(CHARACTERS)[0],mode='normal',backdrop=null,progressSignature='',starting=false;
 let chosenCurses=new Set();
 const cards=new Map();
 const heroOrder=[...new Set(['tracer','gunner','walker',...Object.keys(CHARACTERS)])].filter(id=>CHARACTERS[id]);
 for(const id of heroOrder){
  const character=CHARACTERS[id];
  const button=document.createElement('button');button.type='button';button.className='hero-card';button.dataset.hero=id;
  button.setAttribute('aria-label',`${character.name} · ${HERO_COPY[id]?.[0]||character.desc}`);
  button.innerHTML=`<canvas class="hero-portrait" width="160" height="160" aria-hidden="true"></canvas><span class="hero-card-copy"><strong>${escape(character.name)}</strong><small>${escape(HERO_COPY[id]?.[0]||character.desc)}</small><span>${Math.round(character.stats.maxHp)} 生命 · ${Math.round(character.stats.speed)} 移速</span></span><span class="hero-check" aria-hidden="true">◆</span>`;
  const portrait=button.querySelector('canvas');art.drawPortrait(portrait.getContext('2d'),id,0,0,160);
  button.addEventListener('click',()=>{selected=id;selectHero();});heroes.append(button);cards.set(id,button);
 }
 function selectHero(){
  for(const [id,button] of cards){button.classList.toggle('selected',id===selected);button.setAttribute('aria-pressed',String(id===selected));}
  const c=CHARACTERS[selected];name.textContent=c.name;description.textContent=HERO_COPY[selected]?.[1]||loreText(c.desc);
  if(runtime.catalogs){let skillCopy=root.querySelector('#camp-skill-copy');if(!skillCopy){skillCopy=document.createElement('div');skillCopy.id='camp-skill-copy';skillCopy.className='camp-skill-copy';summary.parentElement.after(skillCopy);}
   const skill=entry('skills',selected,runtime.catalogs.skills[selected]);skillCopy.innerHTML=`<strong>${escape(skill.name)} · 咏誓 · ${runtime.catalogs.skills[selected].cooldown} 秒冷却</strong><p>${escape(skill.desc)}</p><p>天生特性 · ${escape(TRAITS[selected]||loreText(c.passive))}</p>`;}
  summary.textContent=`生命 ${c.stats.maxHp} · 移速 ${c.stats.speed} · 初始伤害 ${Math.round(c.stats.might*100)}%`;
  root.querySelector('#camp-start-hero').textContent=`以${c.name}的身份，踏入长夜。`;
 }
 function refreshCurses(){
  const signature=JSON.stringify(game.meta?.data||{});if(signature===progressSignature)return;progressSignature=signature;
  if(runtime.catalogs)for(const [id,button] of cards){const portrait=button.querySelector('canvas'),ctx=portrait.getContext('2d');ctx.clearRect(0,0,portrait.width,portrait.height);art.drawPortrait(ctx,id,0,0,160);}
  const scene=sm.scenes.curseSelect;scene.enter({charId:selected,metaData:game.meta?.data||{}});
  chosenCurses=new Set(scene.defs.filter(c=>c.active&&c.unlocked).map(c=>c.id));curseList.replaceChildren();
  for(const curse of scene.defs){
   const label=document.createElement('label');label.className='curse-option';
   const input=document.createElement('input');input.type='checkbox';input.checked=chosenCurses.has(curse.id);input.disabled=!curse.unlocked;
   const text=document.createElement('span');text.innerHTML=`<strong>${escape(loreText(curse.name))}${curse.unlocked?'':' · 未解锁'}</strong><small>${escape(loreText(curse.unlocked?curse.desc:curse.unlockHint||'继续远征解锁此试炼'))}</small>`;
   input.addEventListener('change',()=>{if(input.checked)chosenCurses.add(curse.id);else chosenCurses.delete(curse.id);});label.append(input,text);curseList.append(label);
  }
  const record=root.querySelector('#camp-best');record.textContent=game.meta?.data?.totalRuns?`最高击败 ${game.meta.data.bestKills||0} · 已完成 ${game.meta.data.totalRuns} 次远征`:'等待第一位守夜者';
 }
 for(const button of modeButtons)button.addEventListener('click',()=>{
  mode=button.dataset.runMode;const buildButton=root.querySelector('#camp-build');if(buildButton)buildButton.hidden=mode!=='normal';for(const other of modeButtons)other.setAttribute('aria-pressed',String(other===button));
  root.querySelector('#camp-conditions').hidden=mode!=='normal';
  root.querySelector('#camp-mode-note').textContent=({normal:'五个章节，每章四分钟。沿途选择奖励，组合武器与觉醒。',boss:'迎接十波首领，波间选择强化，挑战连续作战的极限。',speed:'以最快速度完成击杀目标，留下你的远征纪录。'})[mode];
 });
 function startJourney(build=null){
  if(starting)return;starting=true;start.disabled=true;
  try{
   sm.switchTo('charSelect',mode==='boss'?{bossRushMode:true}:mode==='speed'?{speedRunMode:true}:{});
   const scene=sm.currentScene;scene.selectedCharId=selected;scene.onSelect(selected,build);
   if(sm.currentSceneName==='curseSelect'){
    const curseScene=sm.currentScene,curses=curseScene.defs.filter(c=>c.unlocked&&chosenCurses.has(c.id));
    platform.api.setStorageSync('flux_last_curses',JSON.stringify(curses.map(c=>c.id)));
    curseScene.onConfirm({charId:selected,curses});
   }
   // The web homepage already presents movement, dash and skill guidance.
   for(let step=0;step<3&&game._tutorialStep>=0&&game._advanceTutorial;step++)game._advanceTutorial();
   afterAction();
  }finally{starting=false;start.disabled=false;}
 }
 start.addEventListener('click',()=>startJourney());
 root.querySelector('#camp-build')?.addEventListener('click',()=>{if(mode!=='normal')return;sm.switchTo('buildSelect',{onSelectBuild:build=>startJourney(build)});afterAction();});
 const navigation=[...document.querySelectorAll('[data-camp-scene]')];
 for(const button of navigation)button.addEventListener('click',()=>{if(button.disabled)return;sm.switchTo(button.dataset.campScene);afterAction();});
 selectHero();start.disabled=false;
 function destroy(){backdrop?.destroy();backdrop=null;}
 return {
  sync(){
   const activeRun=game.isRunning||sm.currentSceneName==='upgrade'||game.stageSystem?.state==='reward'||game.bossRushMode?.state==='reward';
   for(const button of navigation)button.disabled=!!activeRun;
   const visible=['title','charSelect','curseSelect'].includes(sm.currentSceneName);root.hidden=!visible;if(play)play.hidden=visible;
   document.getElementById('game-shell').classList.toggle('at-camp',visible);
   if(!visible){destroy();return false;}
   if(!backdrop)backdrop=createCampBackdrop(background);
   refreshCurses();return true;
  },destroy,
 };
}
