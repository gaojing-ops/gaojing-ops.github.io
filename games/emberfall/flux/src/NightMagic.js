// Deterministic carved sigils and spell animation. No combat RNG or state writes.
const F=require('./FacetedArt');
const V=require('./SpellVfx');
const {DEITIES}=require('./Pantheon');
const TAU=Math.PI*2;
const SKILL_ART={
 tracer:{deity:'ember',symbol:'lantern',life:1.5,radius:48,follow:true},
 walker:{deity:'forge',symbol:'shield',life:5,radius:43,follow:true},
 gunner:{deity:'wind',symbol:'arrow',life:6,radius:55,follow:true},
 cryomancer:{deity:'moon',symbol:'snow',life:1.1},
 biohazard:{deity:'grove',symbol:'thorn',life:1.1},
 berserker:{deity:'ember',symbol:'axe',life:8,radius:60,follow:true},
 arcane:{deity:'night',symbol:'moon',life:6,radius:58,follow:true},
 engineer:{deity:'forge',symbol:'hammer',life:1.5,radius:72},
 assassin:{deity:'night',symbol:'dagger',life:.8},
};
function path(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function line(c,points,color,width=2){c.beginPath();c.strokeStyle=color;c.lineWidth=width;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function gem(c,x,y,r,color){path(c,[[x,y-r],[x+r*.6,y],[x,y+r],[x-r*.6,y]],color);}
function sigil(c,id,x,y,size){
 const deity=id.startsWith('god_')?id.slice(4):SKILL_ART[id.slice(6)]?.deity;
 const d=DEITIES[deity];if(!d)return false;
 const symbol=id.startsWith('god_')?d.icon:SKILL_ART[id.slice(6)].symbol;
 c.save();c.translate(x+size/2,y+size/2);c.scale(size/80,size/80);c.lineWidth=1.5;
 const points=[];for(let i=0;i<8;i++)points.push([Math.cos(i*TAU/8)*35,Math.sin(i*TAU/8)*35]);path(c,points,'#12291f',d.color);
 F.drawIcon(c,symbol,-28,-28,56);
 if(id.startsWith('god_')){gem(c,0,-33,5,d.color);gem(c,0,33,4,d.color);}
 else{line(c,[[-25,28],[0,33],[25,28]],d.color,2.5);for(const v of [-1,1])gem(c,v*29,-19,3,d.color);}
 c.restore();return true;
}
function drawIcon(c,id,x,y,size){if(!sigil(c,id,x,y,size))return F.drawIcon(c,id,x,y,size);return id;}
function makeSkillEffect(game,from){
 const p=game.player,id=p.characterId,s=SKILL_ART[id];if(!s)return null;
 let radius=s.radius||60;
 if(id==='cryomancer')radius=Math.max(540,Math.hypot(game.width||800,game.height||600)*.58)*p.area;
 if(id==='biohazard')radius=Math.min(440*p.area,640);
 if(id==='assassin')radius=165*p.area;
 const points=['cryomancer','biohazard'].includes(id)?(game.enemies||[]).filter(e=>e.active&&Math.hypot(e.x-p.x,e.y-p.y)<=radius).slice(0,48).map(e=>({x:e.x,y:e.y})):[];
 return {kind:id,deity:s.deity,x:p.x,y:p.y,from,age:0,life:s.life,radius,follow:!!s.follow,points};
}
function drawSpell(c,fx,game){V.drawInvocation(c,fx,game);}
function drawNightMagic(c,game){
 const cap=game.qualityLevel>=.5?8:4;
 const skills=(game.skillSystem?.visualEffects||[]).slice(-(cap>=8?3:2));
 for(const fx of skills)drawSpell(c,fx,game);
 for(const fx of (game.pantheon?.effects||[]).slice(-(cap-skills.length)))drawSpell(c,fx,game);
}
module.exports={SKILL_ART,makeSkillEffect,drawNightMagic,drawIcon,drawSpell};
