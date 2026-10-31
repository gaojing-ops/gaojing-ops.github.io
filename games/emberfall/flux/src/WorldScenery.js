// First-version courtyard and independent scenery. No movement or combat rules here.
const TAU=Math.PI*2,SIZE=512,CACHE_LIMIT=16;
const PALETTES={
 CyberGrid:{base:'#142420',patch:['#1b2f27','#24372b'],stone:['#334b41','#3b5145','#3e5449','#30473c'],tree:['#19372d','#244838'],accentColor:'#c5d394'},
 ToxicSwamp:{base:'#1b261c',patch:['#253323','#303d24'],stone:['#323b2c','#35402d','#3a432e','#2c382b'],tree:['#283d25','#3e5130'],accentColor:'#c5d68b'},
 CryoRealm:{base:'#17282e',patch:['#213640','#2c4149'],stone:['#34464a','#3a4d50','#405359','#2e4148'],tree:['#294446','#3a5c5d'],accentColor:'#b5d8da'},
 VoidNebula:{base:'#221f2d',patch:['#302a3b','#3a3043'],stone:['#3b3546','#423a4a','#473d50','#352e40'],tree:['#332c43','#4b4058'],accentColor:'#cbb5d9'},
 Matrix:{base:'#28271e',patch:['#35352a','#403c2b'],stone:['#454334','#4d4938','#504d3b','#3e3d30'],tree:['#343e2d','#50553a'],accentColor:'#dfc58c'}
};
function seeded(seed){return()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
function makeCanvas(w,h){const c=wx.createCanvas();c.width=w;c.height=h;return c;}
function propDraw(ctx){this.scene.drawProp(ctx,this);}
function glow(ctx,x,y,r,color,alpha=.3){ctx.save();ctx.globalAlpha*=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
  function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  function poly(ctx,points,color,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}

class WorldScenery{
 constructor(){this.style='CyberGrid';this.chunks=new Map();this.props=[];this.fireflies=[];this.time=0;this.player=null;this.ground=null;}
 get palette(){return PALETTES[this.style];}
 setStyle(style){style=PALETTES[style]?style:'CyberGrid';if(style===this.style)return;this.style=style;this.ground=null;this.chunks.clear();}
 ensureCourtyard(){
  if(this.ground)return;
  const WORLD={w:2400,h:1800},terrain=makeCanvas(WORLD.w,WORLD.h),ground=terrain.getContext('2d');
  const props=[],fireflies=[],random=seeded(84217),rr=(a,b)=>a+random()*(b-a),p=this.palette;

    ground.fillStyle=p.base;ground.fillRect(0,0,WORLD.w,WORLD.h);
    for(let i=0;i<100;i++) {
      let x=rr(0,WORLD.w),y=rr(0,WORLD.h),r=rr(70,240);
      const g=ground.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,p.patch[i%3?0:1]);g.addColorStop(1,p.base+'00');
      ground.fillStyle=g;ground.fillRect(x-r,y-r,r*2,r*2);
    }
    // A ruined circular courtyard, deliberately imperfect and weathered.
    const cx=WORLD.w/2,cy=WORLD.h/2;
    for(let ring=0;ring<5;ring++) {
      const r=82+ring*64,segments=8+ring*7;
      for(let k=0;k<segments;k++) {
        const a=k/segments*TAU+.03,b=(k+1)/segments*TAU-.03;
        if(random()<.13) continue;
        ground.beginPath();ground.arc(cx,cy,r+27,a,b);ground.arc(cx,cy,r-27,b,a,true);ground.closePath();
        ground.fillStyle=p.stone[Math.floor(random()*4)];ground.fill();
        ground.strokeStyle='#526754';ground.lineWidth=1;ground.stroke();
      }
    }
    ground.strokeStyle='#41645150';ground.lineWidth=2;ground.beginPath();ground.arc(cx,cy,374,0,TAU);ground.stroke();
    for(let i=0;i<16;i++) {
      const a=i/16*TAU;let x=cx+Math.cos(a)*374,y=cy+Math.sin(a)*374;
      ground.save();ground.translate(x,y);ground.rotate(a);ground.strokeStyle='#77957a55';
      ground.beginPath();ground.moveTo(-9,0);ground.lineTo(7,0);ground.lineTo(3,5);ground.moveTo(0,-6);ground.lineTo(0,6);ground.stroke();ground.restore();
    }
    for(let i=0;i<11500;i++) {
      const x=rr(30,WORLD.w-30),y=rr(30,WORLD.h-30);
      if(Math.hypot(x-cx,y-cy)<330&&random()>.15) continue;
      ground.strokeStyle=['#45634238','#72936024','#111f1d88','#425e423d'][Math.floor(random()*4)];
      ground.lineWidth=rr(.5,1.8);ground.beginPath();ground.moveTo(x,y);ground.lineTo(x+rr(-3,3),y-rr(2,9));ground.stroke();
    }
    for(let i=0;i<140;i++) {
      const x=rr(80,WORLD.w-80),y=rr(80,WORLD.h-80);
      if(Math.hypot(x-cx,y-cy)<125) continue;
      props.push({x,y,type:i%7===0?'pillar':i%3===0?'rock':'tree',s:rr(.65,1.35),v:rr(0,TAU)});
    }
    // Four braziers surround the starting sanctuary.
    for(const [x,y] of [[-190,-135],[190,-135],[-190,135],[190,135]]) props.push({x:cx+x,y:cy+y,type:'brazier',s:1,v:0});
    for(let i=0;i<55;i++)fireflies.push({x:rr(40,WORLD.w-40),y:rr(40,WORLD.h-40),v:rr(0,TAU),s:rr(.5,1.7)});


  // Feather the outer edge into the unlimited woodland.
  ground.globalCompositeOperation='destination-out';
  for(const [x0,y0,x1,y1,x,y,w,h] of [[0,0,70,0,0,0,70,1800],[2400,0,2330,0,2330,0,70,1800],[0,0,0,70,0,0,2400,70],[0,1800,0,1730,0,1730,2400,70]]){
   const g=ground.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');ground.fillStyle=g;ground.fillRect(x,y,w,h);
  }
  ground.globalCompositeOperation='source-over';
  this.props=props.map(o=>({...o,x:o.x-1200,y:o.y-900,scene:this,draw:propDraw}));
  this.fireflies=fireflies.map(o=>({...o,x:o.x-1200,y:o.y-900}));this.ground=terrain;
 }
 chunk(cx,cy){
  const key=cx+','+cy;
  if(this.chunks.has(key)){const v=this.chunks.get(key);this.chunks.delete(key);this.chunks.set(key,v);return v;}
  // Local random stream prevents scenery from consuming combat randomness.
  const random=seeded(Math.imul(cx,73856093)^Math.imul(cy,19349663)^84217),rr=(a,b)=>a+random()*(b-a);
  const canvas=makeCanvas(SIZE,SIZE),ctx=canvas.getContext('2d'),p=this.palette,props=[];
  ctx.fillStyle=p.base;ctx.fillRect(0,0,SIZE,SIZE);
  for(let i=0;i<8;i++){
   const x=rr(50,SIZE-50),y=rr(50,SIZE-50),r=rr(25,Math.min(x,y,SIZE-x,SIZE-y)),g=ctx.createRadialGradient(x,y,0,x,y,r);
   g.addColorStop(0,p.patch[i%2]);g.addColorStop(1,p.base+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<700;i++){
   const x=rr(0,SIZE),y=rr(0,SIZE);ctx.strokeStyle=i%2?'#72936024':'#45634238';ctx.lineWidth=rr(.5,1.8);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rr(-3,3),y-rr(2,9));ctx.stroke();
  }
  for(let i=0;i<11;i++){
   const x=cx*SIZE+rr(30,SIZE-30),y=cy*SIZE+rr(30,SIZE-30),s=rr(.65,1.35),v=rr(0,TAU);
   if(x>-1200&&x<1200&&y>-900&&y<900)continue;
   props.push({x,y,s,v,type:i%7===0?'pillar':i%3===0?'rock':'tree',scene:this,draw:propDraw});
  }
  const chunk={canvas,props};this.chunks.set(key,chunk);
  if(this.chunks.size>CACHE_LIMIT)this.chunks.delete(this.chunks.keys().next().value);
  return chunk;
 }
 drawGround(ctx,camX,camY,w,h,dt){
  this.time+=dt||0;this.ensureCourtyard();ctx.fillStyle=this.palette.base;ctx.fillRect(0,0,w,h);
  for(let cy=Math.floor(camY/SIZE);cy*SIZE<camY+h;cy++)for(let cx=Math.floor(camX/SIZE);cx*SIZE<camX+w;cx++){
   if(cx*SIZE>=-1130&&(cx+1)*SIZE<=1130&&cy*SIZE>=-830&&(cy+1)*SIZE<=830)continue;
   ctx.drawImage(this.chunk(cx,cy).canvas,cx*SIZE-camX,cy*SIZE-camY);
  }
  if(camX<1200&&camX+w>-1200&&camY<900&&camY+h>-900)ctx.drawImage(this.ground,-1200-camX,-900-camY);
  for(const f of this.fireflies){
   const x=f.x-camX+Math.sin(this.time*.3+f.v)*9,y=f.y-camY+Math.cos(this.time*.4+f.v)*6;
   if(x<0||y<0||x>w||y>h)continue;
   ctx.globalAlpha=.2+.2*Math.sin(this.time+f.v);ctx.fillStyle=this.palette.accentColor;ctx.beginPath();ctx.arc(x,y,f.s,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 visibleProps(camX,camY,w,h,player){
  this.ensureCourtyard();this.player=player;
  const visible=[],inside=o=>o.x>camX-65&&o.x<camX+w+65&&o.y>camY-20&&o.y<camY+h+150;
  for(const o of this.props)if(inside(o))visible.push(o);
  for(let cy=Math.floor((camY-20)/SIZE);cy*SIZE<camY+h+150;cy++)for(let cx=Math.floor((camX-65)/SIZE);cx*SIZE<camX+w+65;cx++){
   if(cx*SIZE>=-1200&&(cx+1)*SIZE<=1200&&cy*SIZE>=-900&&(cy+1)*SIZE<=900)continue;
   for(const o of this.chunk(cx,cy).props)if(inside(o))visible.push(o);
  }
  return visible;
 }
 drawProp(ctx,o){
  const ambient=this.time,COLORS={amber:'#f6c979'};
    const {x,y,s,type}=o;ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    if(this.player&&(type==='tree'||type==='pillar')&&Math.abs(this.player.x-x)<42*s&&this.player.y<y&&this.player.y>y-(type==='tree'?115:65)*s)ctx.globalAlpha*=.35;
    if(type==='tree'){
      ellipse(ctx,6,6,37,15,'#08151070');
      ctx.strokeStyle='#28352b';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(-2,-38);ctx.lineTo(5,-70);ctx.moveTo(-1,-25);ctx.lineTo(-19,-47);ctx.lineTo(-24,-61);ctx.moveTo(0,-35);ctx.lineTo(21,-53);ctx.stroke();
      poly(ctx,[[-25,-48],[-11,-85],[1,-73],[10,-103],[27,-69],[39,-49],[20,-40],[-2,-50]],this.palette.tree[0]);
      poly(ctx,[[-23,-49],[-9,-72],[3,-59],[15,-87],[26,-64],[34,-50],[15,-46]],this.palette.tree[1]);
      ctx.strokeStyle='#3c5a3d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-42);ctx.lineTo(-10,-55);ctx.moveTo(8,-59);ctx.lineTo(16,-70);ctx.stroke();
    }else if(type==='rock'){
      ellipse(ctx,3,4,21,9,'#07120e88');poly(ctx,[[-18,0],[-14,-14],[2,-21],[20,-9],[16,5],[-3,8]],'#39463c','#4a5747');poly(ctx,[[-14,-14],[2,-21],[20,-9],[0,-6]],'#4e5e4c');ctx.strokeStyle='#293a30';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(2,5);ctx.stroke();
      ellipse(ctx,-8,-12,6,2,'#627b4a70');
    }else if(type==='pillar'){
      ellipse(ctx,7,7,23,9,'#06141088');poly(ctx,[[-14,2],[-14,-46],[1,-51],[15,-45],[15,4],[0,9]],'#384a3e','#526252');poly(ctx,[[-14,-46],[1,-51],[15,-45],[0,-39]],'#657362');poly(ctx,[[0,-39],[15,-45],[15,4],[0,9]],'#293e33');ctx.strokeStyle='#67876c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-8,-30);ctx.lineTo(-3,-27);ctx.lineTo(-8,-19);ctx.lineTo(-3,-13);ctx.stroke();
    }else{
      ellipse(ctx,0,3,21,8,'#07120e99');poly(ctx,[[-15,-5],[-11,-13],[10,-13],[15,-5],[8,4],[-8,4]],'#536252');poly(ctx,[[-5,-5],[-5,-27],[5,-27],[5,-5]],'#495444');ellipse(ctx,0,-28,16,7,'#686b51');ellipse(ctx,0,-28,12,4,'#bb7546');
      glow(ctx,0,-34,55,COLORS.amber,.14);const flick=Math.sin(ambient*8+x)*3;
      poly(ctx,[[-8,-29],[-10,-41],[-3,-49],[0,-60-flick],[7,-45],[9,-34],[5,-28]],'#e59d51');poly(ctx,[[-4,-30],[-4,-43],[1,-49-flick],[5,-37],[3,-29]],'#ffe3a0');
      for(let i=0;i<3;i++){const t=(ambient*.5+i*.37)%1;ellipse(ctx,Math.sin(t*5+i)*9,-40-t*35,1.3,1.3,'#efca87'+Math.round((1-t)*180).toString(16).padStart(2,'0'));}
    }
    ctx.restore();

 }
}
module.exports={WorldScenery,PALETTES,SIZE,CACHE_LIMIT};
