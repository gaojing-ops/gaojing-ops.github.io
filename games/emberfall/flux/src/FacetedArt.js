// Shared, code-native artwork: the same flat facets as Emberfall's first courtyard.
// World actors, portraits and interface emblems all use these models and pigments.
const TAU=Math.PI*2;
const P={ink:'#0b1713',edge:'#d2ddbc',bone:'#e2d7ad',boneLight:'#f4ebcf',gold:'#e7bd70',light:'#f4dfa0',iron:'#83958a',steel:'#c2d1c1',wood:'#8b6a43',shadow:'#020c0bb8'};
const HEROES={
 tracer:{main:'#b5914f',light:'#edc778',dark:'#5e472a',accent:'#f2d485',weapon:'lantern'},
 walker:{main:'#738c83',light:'#c2d8ca',dark:'#374e45',accent:'#ece0ad',weapon:'sword'},
 gunner:{main:'#508e74',light:'#9fceb1',dark:'#264e3c',accent:'#e7d38e',weapon:'bow'},
 cryomancer:{main:'#568caa',light:'#a9ddeb',dark:'#304f6a',accent:'#def2f0',weapon:'frost'},
 biohazard:{main:'#89994a',light:'#cedb83',dark:'#43542a',accent:'#e0e99c',weapon:'thorn'},
 berserker:{main:'#ad6350',light:'#eaa47a',dark:'#65372d',accent:'#f3d28c',weapon:'axe'},
 arcane:{main:'#9675ac',light:'#d6b5df',dark:'#50395f',accent:'#f1d6e6',weapon:'moon'},
 engineer:{main:'#aa8147',light:'#e0b975',dark:'#5e4629',accent:'#f3d48a',weapon:'hammer'},
 assassin:{main:'#73628e',light:'#b6a0d0',dark:'#41334e',accent:'#e2c6ef',weapon:'dagger'}
};
const MONSTERS={
 Bat:{shape:'bat',main:'#6d5e71',light:'#a08d9b',v:0},
 Skeleton:{shape:'skeleton',main:'#a29a80',light:'#e1ddbd',v:0},
 Ghost:{shape:'ghost',main:'#7c8191',light:'#c7d0d4',v:0},
 DataWorm:{shape:'worm',main:'#748067',light:'#a1b286',v:0},
 SwarmDrone:{shape:'fly',main:'#948d5f',light:'#e1d38e',v:0},
 Hornet:{shape:'fly',main:'#aa8c5b',light:'#f1da95',v:1},
 FireFly:{shape:'fly',main:'#b37554',light:'#f1c578',v:2},
 Crawler:{shape:'beetle',main:'#697e5c',light:'#a4b783',v:0},
 WarpMite:{shape:'beetle',main:'#726485',light:'#bea3c6',v:1},
 Turret:{shape:'altar',main:'#8d8463',light:'#d6c695',v:0},
 LaserDrone:{shape:'eye',main:'#846e70',light:'#e2ae96',v:0},
 ScatterGun:{shape:'skeleton',main:'#93795c',light:'#dbbe88',v:1},
 SpiralCaster:{shape:'priest',main:'#7c688a',light:'#c0a7c8',v:0},
 MortarDrone:{shape:'altar',main:'#937e60',light:'#d6bb84',v:1},
 ChainGunner:{shape:'skeleton',main:'#7f765f',light:'#ccba92',v:2},
 FrostWisp:{shape:'ghost',main:'#77969e',light:'#dcf1ef',v:1},
 SlimeGlob:{shape:'slime',main:'#748c67',light:'#b2c994',v:0},
 CyberSpider:{shape:'spider',main:'#838062',light:'#c7bd87',v:0},
 GlitchEntity:{shape:'ghost',main:'#766a86',light:'#c2aecd',v:2},
 FrostTitan:{shape:'golem',main:'#748f95',light:'#c2e1d6',v:1},
 PlagueSource:{shape:'root',main:'#717c59',light:'#bac98b',v:0},
 IronGolem:{shape:'golem',main:'#778379',light:'#bfc8ae',v:0},
 RoyalSlime:{shape:'slime',main:'#8c7e5e',light:'#d8cb92',v:1},
 VoidLeech:{shape:'worm',main:'#695b77',light:'#ab99b7',v:1},
 Assassin:{shape:'hunter',main:'#62586b',light:'#ab94ae',v:0},
 Bomber:{shape:'hunter',main:'#956d59',light:'#f0b97f',v:1},
 ShieldBearer:{shape:'skeleton',main:'#7c8774',light:'#c4d0ab',v:3},
 Charger:{shape:'beast',main:'#83755b',light:'#c7b88e',v:0},
 MiniSpider:{shape:'spider',main:'#858762',light:'#d4d69e',v:1},
 ToxicBlob:{shape:'slime',main:'#7f9159',light:'#c6d888',v:2},
 Healer:{shape:'priest',main:'#698670',light:'#c0e1bd',v:1},
 ShieldPriest:{shape:'priest',main:'#758496',light:'#c5dbe3',v:2},
 LootGoblin:{shape:'goblin',main:'#858d61',light:'#c8d28e',v:0},
 Splitter:{shape:'slime',main:'#86748f',light:'#cfb2d3',v:3},
 Phantom:{shape:'ghost',main:'#7e8094',light:'#dce3ef',v:3}
};
const BOSSES=[
 {shape:'golem',main:'#8b6d5c',light:'#d49d6f',accent:'#f1df94',v:2},
 {shape:'golem',main:'#625c76',light:'#aa99b8',accent:'#f1d8f1',v:3},
 {shape:'hydra',main:'#927054',light:'#dfb77b',accent:'#f1dc99',v:0},
 {shape:'golem',main:'#698b92',light:'#c1dcd6',accent:'#f1f1f1',v:1},
 {shape:'root',main:'#647752',light:'#abbd80',accent:'#e1f1a7',v:1},
 {shape:'rift',main:'#6d5a78',light:'#b89ec7',accent:'#f1d8f1',v:0},
 {shape:'commander',main:'#947d5c',light:'#d6bd87',accent:'#f1f1bb',v:0},
 {shape:'warden',main:'#697e86',light:'#afc8c8',accent:'#ecf1e9',v:0},
 {shape:'hunter',main:'#59505f',light:'#a08ca2',accent:'#f1bbb3',v:2},
 {shape:'vampire',main:'#7f535e',light:'#cc8c94',accent:'#f1d5d3',v:0}
];
function poly(c,points,color,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.stroke();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
function gem(c,x,y,r,color,light=P.boneLight){poly(c,[[x,y-r],[x+r*.65,y],[x,y+r],[x-r*.65,y]],color);poly(c,[[x,y-r],[x,y+r*.35],[x-r*.65,y]],light);}
function eyes(c,y,color=P.boneLight,spread=6){line(c,[[-spread-2,y],[-spread+1,y]],color,2);line(c,[[spread-1,y],[spread+2,y]],color,2);}
function flame(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-8,3],[-10,-6],[-3,-15],[0,-28],[7,-12],[10,-2],[5,5]],'#d29b59');poly(c,[[-4,2],[-4,-7],[1,-17],[5,-5],[3,3]],'#f1d492');c.restore();}
function lantern(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);line(c,[[-5,-14],[-5,-20],[4,-20],[5,-14]],P.gold,2);poly(c,[[-9,-14],[8,-14],[10,7],[-10,7]],P.wood,P.gold);poly(c,[[-5,-10],[4,-10],[5,4],[-5,4]],'#e4bc77');poly(c,[[0,-9],[4,-10],[5,4],[0,4]],'#f4dca0');line(c,[[0,-14],[0,7]],P.gold,1);c.restore();}
function shield(c,x,y,s=1,color=P.iron){c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-17,-20],[14,-23],[16,3],[0,17],[-18,1]],color,P.bone);poly(c,[[-17,-20],[0,-22],[0,17],[-18,1]],P.iron);line(c,[[0,-17],[0,9]],P.gold,2);c.restore();}
function blade(c,x,y,s=1,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);poly(c,[[-3,6],[-4,-30],[0,-44],[5,-30],[3,6]],P.steel);poly(c,[[0,-44],[5,-30],[3,6],[0,6]],P.boneLight);line(c,[[-11,6],[11,6]],P.gold,3);line(c,[[0,7],[0,20]],P.wood,4);c.restore();}
function bow(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);line(c,[[0,-35],[14,-18],[18,0],[13,19],[0,33]],P.gold,3);line(c,[[0,-35],[0,33]],P.bone,1);line(c,[[-11,0],[24,0]],P.steel,2);poly(c,[[24,0],[15,-5],[15,5]],P.boneLight);c.restore();}
function staff(c,x,y,color=P.gold,kind='gem'){line(c,[[x,y+23],[x-3,y-47]],P.wood,4);if(kind==='moon'){poly(c,[[x+4,y-62],[x-11,y-55],[x-12,y-40],[x+2,y-33],[x-5,y-43],[x-5,y-52]],color);}else if(kind==='thorn'){line(c,[[x-4,y-35],[x-14,y-48],[x-11,y-62]],color,3);line(c,[[x-2,y-44],[x+9,y-56],[x+8,y-66]],color,3);gem(c,x-2,y-50,8,color);}else gem(c,x-3,y-50,13,color);}
function hero(c,id,pose=0){
 const d=HEROES[id],step=pose?3:-1;
 poly(c,[[-16,-10],[-16,2],[-5,2],[-6,-11]],P.ink);poly(c,[[5,-11],[5,2+step],[16,2+step],[15,-11]],P.ink);
 poly(c,[[-18,-61],[-29,-8],[-15,-12],[-3,-4],[5,-14],[22,-6],[29,-11],[17,-61]],d.main,P.ink);
 poly(c,[[-18,-61],[-22,-18],[-12,-27],[-4,-8],[1,-55]],d.light);
 poly(c,[[1,-55],[5,-14],[22,-6],[17,-61]],d.dark);
 poly(c,[[-19,-59],[-27,-42],[-25,-25],[-17,-29],[-11,-56]],d.dark);
 poly(c,[[18,-60],[26,-46],[29,-27],[21,-26],[11,-55]],d.light);
 poly(c,[[-15,-57],[-12,-30],[12,-30],[14,-57],[0,-66]],d.main);
 line(c,[[-17,-26],[16,-26]],P.wood,5);gem(c,0,-26,4,P.gold,P.light);
 if(id==='walker'){
  poly(c,[[-18,-60],[-24,-48],[-13,-44],[-8,-56]],P.steel);poly(c,[[9,-57],[20,-61],[27,-47],[15,-44]],P.steel);
  poly(c,[[-15,-61],[-15,-84],[-5,-99],[12,-95],[20,-77],[13,-59]],d.dark,P.steel);
  poly(c,[[-5,-96],[5,-94],[5,-62],[-2,-62]],P.bone);line(c,[[-12,-76],[15,-76]],P.ink,4);
  shield(c,-25,-24,.83,d.light);blade(c,30,-37,.83,.12);
 }else{
  poly(c,[[-16,-60],[-21,-78],[-10,-98],[10,-94],[22,-76],[14,-58]],d.dark,P.ink);
  poly(c,[[-21,-78],[-10,-98],[1,-91],[-6,-73],[-16,-60]],d.light);
  poly(c,[[-10,-78],[9,-79],[13,-67],[6,-61],[-10,-64]],P.ink);
  eyes(c,-72,d.accent,4);
  if(id==='tracer'){line(c,[[23,-37],[31,-53],[30,-64]],P.wood,3);lantern(c,31,-43,.8);}
  if(id==='gunner'){bow(c,30,-41,.81);poly(c,[[-15,-86],[-35,-100],[-24,-79]],d.light);}
  if(id==='cryomancer'){staff(c,29,-34,d.accent);poly(c,[[-20,-54],[-32,-60],[-25,-39],[-13,-46]],d.light);}
  if(id==='biohazard'){staff(c,29,-29,d.accent,'thorn');poly(c,[[-28,-27],[-34,-22],[-34,-11],[-23,-10],[-22,-22]],d.accent);}
  if(id==='berserker'){
   poly(c,[[-23,-53],[-32,-66],[-16,-66],[-9,-50]],P.iron);poly(c,[[10,-53],[20,-67],[32,-58],[23,-44]],P.iron);
   line(c,[[28,-9],[29,-62]],P.wood,5);poly(c,[[28,-62],[47,-68],[45,-45],[30,-42],[30,-52],[20,-53]],P.steel,P.bone);
   line(c,[[-14,-88],[-23,-94],[-22,-106]],P.bone,4);line(c,[[13,-87],[24,-94],[22,-106]],P.bone,4);
  }
  if(id==='arcane'){staff(c,29,-31,d.accent,'moon');poly(c,[[-23,-81],[0,-111],[20,-80],[4,-84],[-9,-79]],d.main);poly(c,[[0,-111],[4,-84],[-9,-79]],d.light);poly(c,[[-30,-29],[-12,-33],[-11,-11],[-30,-7]],P.wood,P.gold);line(c,[[-26,-24],[-17,-25],[-17,-15]],P.bone,1);}
  if(id==='engineer'){
   poly(c,[[-21,-81],[-19,-95],[13,-96],[23,-78]],P.gold,P.wood);line(c,[[-13,-76],[-3,-76]],P.bone,5);line(c,[[5,-76],[15,-76]],P.bone,5);
   line(c,[[28,-9],[28,-49]],P.wood,5);poly(c,[[17,-54],[39,-58],[42,-45],[18,-41]],P.iron,P.gold);lantern(c,-26,-18,.65);
  }
  if(id==='assassin'){blade(c,29,-30,.55,.7);blade(c,-29,-22,.48,-.8);poly(c,[[0,-91],[13,-104],[9,-82]],d.light);}
 }
}
function monster(c,d,pose=0,boss=false){
 const a=d.accent||d.light,wing=pose?8:-3;
 if(d.shape==='bat'||d.shape==='fly'){
  const fly=d.shape==='fly';
  poly(c,[[-4,-37],[-26,-59-wing],[-48,-47-wing],[-34,-26],[-22,-32],[-10,-19]],d.main,P.ink);
  poly(c,[[4,-37],[26,-59-wing],[48,-47-wing],[34,-26],[22,-32],[10,-19]],d.main,P.ink);
  poly(c,[[-8,-34],[-26,-48-wing],[-34,-34],[-21,-36]],d.light);poly(c,[[8,-34],[26,-48-wing],[34,-34],[21,-36]],d.light);
  poly(c,[[-8,-46],[0,-57],[9,-45],[8,-20],[0,-11],[-9,-21]],fly?d.light:d.main,P.ink);
  if(fly){line(c,[[-8,-37],[8,-37]],P.ink,3);line(c,[[-8,-29],[8,-29]],P.ink,3);if(d.v===1)poly(c,[[-4,-18],[0,-3],[4,-18]],P.bone);if(d.v===2)gem(c,0,-24,8,P.light,P.gold);}
  else{poly(c,[[-9,-44],[-13,-63],[0,-55],[12,-63],[9,-43]],d.main);eyes(c,-46,P.light,4);}
 }else if(d.shape==='ghost'){
  poly(c,[[-22,0],[-29,-25],[-21,-60],[-8,-78],[11,-76],[25,-57],[29,-22],[23,1],[10,-6],[0,5],[-10,-5]],d.main,P.ink);
  poly(c,[[-20,-57],[-8,-78],[1,-72],[-6,-33],[-16,-13]],d.light);
  poly(c,[[-13,-52],[-5,-63],[9,-61],[16,-47],[10,-32],[-10,-33]],P.ink);eyes(c,-49,a,6);
  line(c,[[-23,-35],[-36,-22+wing]],d.light,3);line(c,[[23,-35],[37,-22-wing]],d.light,3);
  if(d.v===1){gem(c,0,-20,9,P.boneLight,d.light);poly(c,[[0,-81],[8,-91],[6,-70]],d.light);}
  if(d.v===2){poly(c,[[-32,-49],[-38,-56],[-41,-39]],d.light);poly(c,[[32,-8],[40,-20],[43,-5]],d.light);}
  if(d.v===3)poly(c,[[-11,-55],[11,-55],[6,-32],[-6,-32]],P.bone);
 }else if(d.shape==='spider'||d.shape==='beetle'){
  for(let i=0;i<4;i++){const y=-17-i*8,k=(i%2?1:-1)*(pose?4:0);line(c,[[-9,y],[-30,y-9+k],[-43,y+11+k]],d.light,3);line(c,[[9,y],[30,y-9-k],[43,y+11-k]],d.light,3);}
  poly(c,[[-18,-21],[-23,-46],[-9,-65],[10,-63],[24,-43],[18,-20],[0,-12]],d.main,P.ink);
  poly(c,[[-23,-46],[-9,-65],[0,-57],[0,-17],[-18,-21]],d.light);
  poly(c,[[-13,-46],[-8,-57],[9,-56],[14,-44],[8,-34],[-7,-34]],d.main,P.ink);eyes(c,-46,P.light,5);
  if(d.shape==='beetle'){line(c,[[0,-63],[0,-17]],P.ink,2);poly(c,[[0,-64],[0,-80],[9,-61]],d.light);}
  if(d.v===1){gem(c,0,-25,7,d.light);}
 }else if(d.shape==='worm'){
  for(let i=3;i>=0;i--){const x=(i%2?1:-1)*(pose?5:2),y=-14-i*14,r=15+i;poly(c,[[x-r,y],[x-r+4,y-15],[x+3,y-21],[x+r,y-8],[x+r-4,y+8],[x-5,y+10]],d.main,P.ink);poly(c,[[x-r+4,y-15],[x+3,y-21],[x+r,y-8],[x,y-3]],d.light);}
  eyes(c,-62,P.light,6);if(d.v)line(c,[[-8,-46],[0,-40],[7,-46]],P.bone,3);
 }else if(d.shape==='slime'){
  poly(c,[[-36,0],[-32,-24],[-20,-48],[-4,-61],[17,-54],[31,-29],[38,0],[17,6],[-14,5]],d.main,P.ink);
  poly(c,[[-32,-24],[-20,-48],[-4,-61],[3,-47],[-8,-20],[-25,-6]],d.light);
  eyes(c,-27,P.boneLight,9);line(c,[[-7,-15],[5,-14]],P.ink,2);
  if(d.v===1){poly(c,[[-21,-50],[-22,-72],[-10,-62],[0,-79],[9,-62],[22,-72],[19,-50]],P.gold,P.wood);gem(c,0,-58,5,P.light);}
  if(d.v===2){gem(c,-16,-25,5,d.light);gem(c,16,-16,5,d.light);}
  if(d.v===3){poly(c,[[8,-53],[16,-68],[29,-63],[34,-47],[22,-39]],d.light);}
 }else if(d.shape==='skeleton'){
  line(c,[[-10,-30],[-14,0]],d.light,6);line(c,[[10,-30],[14,pose?3:0]],d.light,6);
  poly(c,[[-16,-58],[-23,-30],[0,-19],[21,-31],[15,-58]],d.main,P.ink);
  line(c,[[0,-53],[0,-24]],P.bone,4);for(let i=0;i<3;i++)line(c,[[-11,-48+i*7],[0,-43+i*7],[11,-48+i*7]],P.bone,3);
  poly(c,[[-14,-59],[-17,-75],[-8,-87],[9,-86],[17,-73],[12,-57],[6,-51],[-7,-52]],P.bone,P.ink);
  poly(c,[[-12,-73],[-4,-73],[-3,-66],[-10,-65]],P.ink);poly(c,[[4,-73],[12,-73],[10,-65],[3,-66]],P.ink);
  if(d.v===0)blade(c,27,-31,.64,.3);else if(d.v===3)shield(c,-24,-30,.8,d.light);else{bow(c,26,-35,.67);if(d.v===2)line(c,[[17,-43],[42,-43]],d.light,4);}
 }else if(d.shape==='priest'||d.shape==='hunter'||d.shape==='goblin'){
  const wide=d.shape==='goblin';
  poly(c,[[-13,-10],[-17,2],[-5,1],[-3,-10]],P.wood);poly(c,[[4,-10],[6,3],[18,1],[15,-11]],P.wood);
  poly(c,[[-18,-51],[-28,-3],[-8,-8],[0,0],[12,-9],[27,-3],[17,-51]],d.main,P.ink);poly(c,[[-18,-51],[-23,-10],[-8,-21],[0,-48]],d.light);
  poly(c,[[-17,-46],[-20,-64],[-7,-83],[11,-79],[21,-60],[14,-44]],d.main,P.ink);poly(c,[[-10,-62],[9,-64],[13,-51],[-11,-49]],P.ink);eyes(c,-57,P.boneLight,5);
  if(d.shape==='priest'){staff(c,29,-23,a,d.v===0?'moon':'gem');if(d.v===1){line(c,[[-5,-91],[5,-91]],P.boneLight,3);line(c,[[0,-96],[0,-86]],P.boneLight,3);}if(d.v===2)shield(c,-25,-24,.63,d.light);}
  if(d.shape==='hunter'){if(d.v===1){poly(c,[[20,-40],[36,-43],[42,-26],[32,-15],[18,-24]],d.light,P.wood);flame(c,31,-40,.5);}else{blade(c,27,-25,.55,.8);blade(c,-27,-25,.5,-.8);}}
  if(wide){poly(c,[[-20,-60],[-37,-69],[-24,-49]],d.light);poly(c,[[19,-60],[36,-69],[25,-49]],d.light);poly(c,[[19,-38],[39,-34],[43,-10],[28,1],[13,-14]],P.wood,P.gold);gem(c,30,-17,7,P.gold,P.light);}
 }else if(d.shape==='altar'){
  poly(c,[[-30,0],[-26,-17],[24,-17],[32,1],[0,10]],d.main,P.ink);poly(c,[[-20,-14],[-17,-41],[17,-41],[22,-14]],d.main);poly(c,[[-17,-41],[0,-51],[17,-41],[0,-33]],d.light);
  if(d.v===0){bow(c,0,-50,.67);gem(c,0,-52,11,P.gold);}else{poly(c,[[-15,-43],[-20,-68],[0,-77],[21,-65],[15,-43]],d.light,P.ink);flame(c,0,-58,.7);}
 }else if(d.shape==='eye'){
  poly(c,[[-10,-21],[-30,-39],[-30,-61],[-10,-79],[10,-79],[31,-59],[31,-39],[10,-21]],d.main,P.ink);poly(c,[[-30,-61],[-10,-79],[1,-66],[-17,-48]],d.light);
  oval(c,0,-49,17,12,P.ink);gem(c,0,-49,11,a,P.boneLight);poly(c,[[-27,-45],[-46,-58],[-39,-30]],d.light);poly(c,[[27,-45],[46,-58],[39,-30]],d.light);
 }else if(d.shape==='beast'){
  line(c,[[-19,-24],[-25,1]],d.main,9);line(c,[[20,-25],[28,0]],d.main,9);poly(c,[[-28,-18],[-34,-42],[-19,-66],[8,-70],[33,-48],[29,-15],[0,-7]],d.main,P.ink);poly(c,[[-34,-42],[-19,-66],[8,-70],[0,-44],[-17,-34]],d.light);
  poly(c,[[-17,-39],[-14,-60],[12,-60],[19,-39],[10,-21],[-9,-21]],d.light);poly(c,[[-12,-58],[-26,-79],[-20,-47]],P.bone);poly(c,[[13,-58],[26,-79],[21,-46]],P.bone);eyes(c,-46,P.ink,7);
 }else if(d.shape==='golem'||d.shape==='root'){
  const root=d.shape==='root';
  poly(c,[[-27,0],[-23,-21],[-8,-29],[-7,-1]],d.main,P.ink);poly(c,[[8,-26],[25,-20],[29,1],[9,-1]],d.main,P.ink);
  poly(c,[[-22,-25],[-30,-58],[-19,-82],[10,-86],[30,-62],[24,-24],[0,-13]],d.main,P.ink);poly(c,[[-30,-58],[-19,-82],[0,-73],[0,-17],[-22,-25]],d.light);
  poly(c,[[-25,-60],[-43,-61],[-48,-35],[-34,-28],[-24,-42]],d.main,P.ink);poly(c,[[25,-61],[43,-58],[48,-32],[33,-28],[24,-42]],d.light,P.ink);
  poly(c,[[-17,-67],[-15,-88],[-3,-99],[14,-88],[20,-68],[8,-58],[-9,-59]],d.light,P.ink);eyes(c,-78,root?'#c5cf8f':a,7);
  gem(c,0,-45,12,root?'#9aaf71':d.accent||d.light,P.bone);
  if(root){for(const side of [-1,1]){line(c,[[side*15,-84],[side*30,-100],[side*27,-117]],P.wood,5);line(c,[[side*30,-100],[side*42,-108]],d.light,3);poly(c,[[side*20,-52],[side*44,-75],[side*36,-49]],d.light);}}
  else if(d.v===1){for(const [x,y] of [[-24,-65],[25,-65],[0,-96]])gem(c,x,y,16,P.steel,P.boneLight);}
  else if(d.v===2){flame(c,0,-48,.8);line(c,[[-12,-62],[-16,-48],[-7,-33]],d.accent,2);}
  else if(d.v===3){poly(c,[[-33,-63],[-49,-86],[-42,-43]],d.light);poly(c,[[33,-63],[49,-86],[42,-43]],d.light);}
 }else if(d.shape==='hydra'){
  // Six smaller necks behind the three foreground heads make the nine-headed silhouette.
  for(const [x,y] of [[-48,-78],[-35,-100],[-14,-116],[14,-116],[35,-100],[48,-78]]){line(c,[[x*.25,-22],[x*.8,-54],[x,y]],d.main,8);poly(c,[[x-8,y+1],[x-9,y-9],[x,y-15],[x+9,y-8],[x+7,y+3]],d.main,P.ink);line(c,[[x-4,y-7],[x+4,y-7]],P.light,1.5);}
  poly(c,[[-32,0],[-36,-31],[-15,-58],[16,-59],[37,-29],[33,0]],d.main,P.ink);
  for(const [x,y] of [[-29,-78],[0,-98],[29,-78]]){line(c,[[x*.4,-23],[x,-49],[x,y]],d.main,15);poly(c,[[x-13,y+1],[x-14,y-15],[x+1,y-22],[x+15,y-11],[x+12,y+5]],d.light,P.ink);line(c,[[x-7,y-10],[x-3,y-10]],P.light,2);line(c,[[x+5,y-10],[x+9,y-10]],P.light,2);poly(c,[[x-8,y-18],[x-16,y-31],[x-3,y-21]],P.bone);}
 }else if(d.shape==='rift'){
  poly(c,[[-30,-14],[-44,-50],[-21,-94],[8,-112],[39,-72],[43,-38],[17,2]],d.main,P.ink);poly(c,[[-21,-94],[8,-112],[18,-86],[-23,-40],[-30,-14],[-44,-50]],d.light);
  poly(c,[[0,-91],[22,-62],[13,-25],[-7,-9],[-24,-49]],P.ink);gem(c,0,-52,25,d.accent,'#6b597b');gem(c,0,-52,12,P.ink,d.main);
  for(const [x,y] of [[-42,-89],[42,-97],[-44,-20],[35,7]])gem(c,x,y,8,d.light);
 }else if(d.shape==='commander'){
  hero(c,'walker',pose);poly(c,[[-25,-59],[-34,-70],[-13,-72],[-8,-58]],d.light);poly(c,[[9,-59],[22,-73],[34,-65],[27,-50]],d.light);poly(c,[[-12,-92],[-16,-113],[-3,-103],[7,-117],[16,-99],[13,-89]],P.gold);shield(c,-29,-27,.9,d.light);blade(c,32,-37,1.13,.1);
 }else if(d.shape==='warden'||d.shape==='vampire'){
  poly(c,[[-20,-64],[-39,-8],[-20,-13],[-9,3],[3,-9],[20,0],[38,-9],[22,-63]],d.main,P.ink);poly(c,[[-20,-64],[-29,-17],[-10,-30],[0,-57]],d.light);
  poly(c,[[-16,-64],[-18,-88],[0,-102],[18,-88],[16,-64],[4,-53],[-8,-56]],d.light,P.ink);poly(c,[[-11,-82],[12,-82],[7,-64],[-6,-64]],P.ink);eyes(c,-77,P.boneLight,6);
  if(d.shape==='warden'){for(const side of [-1,1]){line(c,[[side*10,-93],[side*27,-107],[side*26,-123]],P.bone,4);line(c,[[side*27,-107],[side*39,-113]],P.bone,3);}staff(c,35,-24,d.accent);}
  else{poly(c,[[-14,-92],[-18,-113],[-4,-104],[2,-119],[10,-103],[21,-112],[15,-91]],P.gold);poly(c,[[-24,-58],[-47,-81],[-41,-32],[-30,-41]],d.light);poly(c,[[24,-58],[47,-81],[41,-32],[30,-41]],d.light);gem(c,0,-40,11,d.accent);}
 }
}

// Canvas caches contain only flat artwork; no texture sheets or network images.
const cache=new Map();
function model(sheet,id,pose){
 const key=sheet+':'+id+':'+pose;if(cache.has(key))return cache.get(key);
 const canvas=wx.createCanvas(),resolution=sheet==='bosses'?384:sheet==='heroes'?256:192,factor=resolution/192;canvas.width=resolution;canvas.height=resolution;canvas.name=sheet;canvas.artKey=key;
 const c=canvas.getContext('2d');c.translate(96*factor,173*factor);c.scale(1.22*factor,1.22*factor);
 if(sheet==='heroes')hero(c,id,pose);else monster(c,sheet==='bosses'?BOSSES[id]:MONSTERS[id],pose,sheet==='bosses');
 cache.set(key,canvas);return canvas;
}
function sprite(c,sheet,id,x,y,extent,flip,pose,bob=0,flash=false,alpha=1){
 const image=model(sheet,id,pose);c.save();c.translate(x,y+bob);if(flip)c.scale(-1,1);c.globalAlpha*=alpha;if(flash)c.filter='brightness(1.6)';
 c.drawImage(image,-extent*.64,-extent*1.01,extent*1.28,extent*1.28);c.restore();return true;
}
function shadow(c,x,y,r,alpha=1){c.save();c.globalAlpha*=alpha;oval(c,x,y+r*.85,r*1.05,r*.36,P.shadow);c.restore();}
function drawHero(c,id,x,y,radius,angle=0,moving=false,time=0,alpha=1){
 if(!HEROES[id])return false;shadow(c,x,y,radius,alpha);
 const extent=radius*3.45,bob=moving?Math.sin(time*11)*1:0;
 sprite(c,'heroes',id,x,y+radius*.8,extent,Math.cos(angle)<0,moving?Math.floor(time*8)%2:0,bob,false,alpha);
 c.save();c.globalAlpha*=alpha*.95;c.strokeStyle=P.light;c.lineWidth=2;c.beginPath();c.ellipse(x,y+radius*.85,radius*.94,radius*.32,0,0,TAU);c.stroke();c.restore();return true;
}
function drawPortrait(c,id,x,y,size){if(!HEROES[id])return false;const image=model('heroes',id,0),w=size*148/165,f=image.width/192;c.drawImage(image,22*f,16*f,148*f,165*f,x+(size-w)/2,y,w,size);return true;}
function drawMonster(c,e){
 if(!MONSTERS[e.type])return false;const time=e.game.time||0;shadow(c,e.x,e.y,e.radius);
 return sprite(c,'monsters',e.type,e.x,e.y+e.radius*.8,e.radius*3.1,e.game.player.x<e.x,Math.floor(time*6+e.x*.1)&1,Math.sin(time*5+e.x*.1)*.65,e.flashTimer>0);
}
function drawBoss(c,b){const index=Math.max(0,Math.min(BOSSES.length-1,b.artIndex||0));shadow(c,b.x,b.y,b.radius);return sprite(c,'bosses',index,b.x,b.y+b.radius*.85,b.radius*3.1,b.game.player.x<b.x,Math.floor((b.game.time||0)*2)%2,Math.sin((b.game.time||0)*2)*1,b.flashTimer>0);}
const ICON_KEYS={
 flux_bolt:'lantern',chain_spark:'lightning',pulse_ring:'ring',radiation_field:'rune',soul_drain:'soul',shadow_clone:'mask',plasma_arc:'blade',napalm:'flask',rocket_swarm:'flame',ice_shard:'crystal',glacial_nova:'snow',frozen_orb:'orb',toxin_spray:'leaf',acid_pool:'flask',venom_sting:'thorn',boomerang:'boomerang',chain_drill:'saw',holy_water:'flask',phase_blade:'sword',gravity_cannon:'orb',nano_swarm:'moth',
 overclocker:'hourglass',nano_repair:'leaf',energy_amp:'candle',spinach:'heart',bracer:'arrow',duplicator:'feather',armor:'shield',wings:'feather',attractorb:'bell',cryo_core:'crystal',frost_armor:'shield',chill_aura:'snow',toxic_sac:'flask',corrosion:'thorn',plague_spread:'leaf',lucky_shot:'coin',void_core:'orb',shadow_step:'mask',soul_harvest:'soul',thermal_core:'flame',explosive_rounds:'flame',overheat:'flame',xp_magnet:'book',critical_eye:'eye',second_wind:'heart',hunter_instinct:'arrow',
 tracer:'lantern',walker:'shield',gunner:'bow',cryomancer:'snow',biohazard:'thorn',berserker:'axe',arcane:'moon',engineer:'hammer',assassin:'dagger',
 antimatter_engine:'feather',time_shard:'hourglass',overload_core:'candle',revival_node:'lantern',mirror_chip:'crystal',critical_mass:'lightning',void_contract:'book',limit_break:'shield',quantum_dice:'rune',greed_protocol:'coin',echo_chip:'bell',bloodrage:'heart',elemental_core:'rune',frenzy_module:'arrow',lucky_coin:'coin',magnet_core:'bell',time_dilation:'hourglass',explosive_blood:'heart',shield_gen:'shield',tiny_wings:'feather',regen_drone:'leaf',xp_boost:'book',phase_shield:'shield',bullet_matrix:'ring',vampire_pact:'dagger',resonance_core:'crown',scrap_recycle:'coin',
 meta_hp:'heart',meta_might:'sword',meta_speed:'feather',meta_pickup:'bell',meta_cdr:'hourglass',meta_regen:'leaf',meta_reroll:'rune',meta_skip:'arrow',meta_banish:'mask',meta_mastery:'eye',dog:'paw',medic:'leaf',drone:'lantern',power:'sword',skill:'feather',survival:'shield'
};
function iconKey(key){if(ICON_KEYS[key])return ICON_KEYS[key];if(key.startsWith('fusion_'))return 'crown';if(key.startsWith('pow_'))return 'sword';if(key.startsWith('ski_'))return 'feather';if(key.startsWith('sur_'))return 'shield';if(key.includes('heal')||key.includes('regen'))return 'leaf';if(key.includes('shield')||key.includes('armor'))return 'shield';if(key.includes('time')||key.includes('cool'))return 'hourglass';if(key.includes('blood')||key.includes('heart'))return 'heart';if(key.includes('coin')||key.includes('gold'))return 'coin';if(key.includes('flame')||key.includes('fire'))return 'flame';return ['lantern','flame','leaf','crystal','shield','book','rune','orb','moon','feather','heart','eye','bell','bow','sword','dagger','hammer','axe','candle','soul','mask','ring','thorn','boomerang','saw','moth','paw','hourglass','coin','arrow','lightning','crown','flask'].includes(key)?key:'rune';}
function drawIcon(c,key,x,y,size){
 const kind=iconKey(key);c.save();c.translate(x+size/2,y+size/2);c.scale(size/64,size/64);
 const gold=P.gold,light=P.boneLight,green='#8fa780',dark='#52644d';
 if(kind==='lantern')lantern(c,0,4,1.5);
 else if(kind==='flame'||kind==='candle'){if(kind==='candle')poly(c,[[-8,19],[-7,-8],[6,-8],[9,19]],P.bone,P.wood);flame(c,0,kind==='candle'?-8:14,1.15);}
 else if(kind==='shield')shield(c,0,0,1.18);
 else if(kind==='sword'||kind==='dagger'||kind==='blade')blade(c,0,10,kind==='dagger'?.8:1,kind==='blade'?.6:.15);
 else if(kind==='bow')bow(c,-6,0,.76);
 else if(kind==='axe'||kind==='hammer'){line(c,[[-8,27],[4,-16]],P.wood,5);poly(c,kind==='axe'?[[2,-20],[25,-26],[26,-5],[9,3],[0,-5]]:[[-10,-22],[24,-17],[23,-2],[-14,-8]],P.steel,gold);}
 else if(kind==='leaf'||kind==='feather'){poly(c,[[-19,22],[-20,-3],[-8,-23],[19,-28],[21,-5],[9,14]],green,dark);poly(c,[[-19,22],[-8,-23],[19,-28],[1,-1]],'#b5c09a');line(c,[[-24,27],[13,-20]],P.wood,2);if(kind==='feather')for(let i=0;i<3;i++)line(c,[[-12+i*7,10-i*9],[6+i*3,7-i*9]],dark,1);}
 else if(kind==='crystal'||kind==='orb'||kind==='soul'){gem(c,0,0,26,kind==='crystal'?'#789c9c':'#83738e',kind==='crystal'?'#c7d8c5':'#c5b3c9');if(kind!=='crystal'){line(c,[[-24,16],[0,24],[26,10]],gold,2);gem(c,0,0,10,P.ink,'#a799b1');}}
 else if(kind==='snow'){for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI/3);line(c,[[0,-26],[0,26]],'#b2cbc4',3);for(const s of [-1,1]){line(c,[[-7,s*15],[0,s*22],[7,s*15]],'#b2cbc4',2);}c.restore();}gem(c,0,0,7,light);}
 else if(kind==='flask'){poly(c,[[-7,-24],[7,-24],[7,-7],[19,9],[17,24],[-18,24],[-21,10],[-7,-7]],'#8d9c7b',light);poly(c,[[-15,4],[14,4],[18,13],[15,21],[-15,21],[-18,12]],'#60794b');line(c,[[-10,-25],[10,-25]],P.wood,5);gem(c,-3,10,5,'#bdcb8a');}
 else if(kind==='heart'){poly(c,[[0,26],[-25,2],[-26,-13],[-14,-23],[0,-14],[14,-23],[26,-13],[25,2]],'#986858',P.wood);poly(c,[[0,26],[-25,2],[-26,-13],[-14,-23],[0,-14]],'#c9977b');}
 else if(kind==='book'){poly(c,[[-25,-22],[-3,-19],[0,-14],[3,-19],[25,-22],[25,22],[4,25],[0,22],[-4,25],[-25,22]],P.wood,gold);poly(c,[[-20,-16],[-4,-13],[-4,18],[-20,15]],P.bone);poly(c,[[4,-13],[20,-16],[20,15],[4,18]],'#aba88b');line(c,[[0,-13],[0,21]],gold,2);}
 else if(kind==='hourglass'){poly(c,[[-17,-22],[17,-22],[14,-10],[3,0],[14,12],[17,24],[-17,24],[-14,11],[-3,0],[-14,-11]],'#6f8477',P.bone);poly(c,[[-10,-14],[10,-14],[0,-2]],gold);poly(c,[[0,5],[11,18],[-11,18]],gold);line(c,[[-21,-25],[21,-25]],P.wood,4);line(c,[[-21,27],[21,27]],P.wood,4);}
 else if(kind==='eye'||kind==='mask'){poly(c,[[-28,0],[-14,-18],[8,-20],[28,0],[13,16],[-12,16]],'#6e7e6d',P.bone);gem(c,0,-1,14,P.ink,gold);if(kind==='mask'){poly(c,[[-20,2],[-12,24],[0,30],[14,22],[21,0]],'#647464');eyes(c,1,P.bone,9);}}
 else if(kind==='bell'){poly(c,[[-22,17],[-13,7],[-11,-15],[0,-24],[12,-15],[14,8],[23,17]],gold,P.wood);poly(c,[[-13,7],[-11,-15],[0,-24],[0,14]],light);oval(c,0,19,7,5,P.wood);}
 else if(kind==='coin'){poly(c,[[-25,-10],[-11,-25],[13,-24],[26,-8],[23,15],[6,27],[-16,21],[-27,5]],gold,P.wood);gem(c,0,0,16,P.wood,light);}
 else if(kind==='moon')staff(c,0,22,'#c4b6c8','moon');
 else if(kind==='thorn'){line(c,[[-20,26],[-13,3],[7,-10],[13,-28]],green,5);for(const [x,y] of [[-13,3],[7,-10],[13,-24]])poly(c,[[x,y],[x-12,y-9],[x-3,y-12]],'#b2bf8d');}
 else if(kind==='arrow'||kind==='lightning'){if(kind==='arrow'){line(c,[[-23,23],[21,-21]],P.wood,4);poly(c,[[22,-25],[19,-6],[6,-19]],P.bone);line(c,[[-22,12],[-23,23],[-11,23]],gold,3);}else poly(c,[[5,-29],[-19,2],[-1,2],[-10,30],[22,-8],[5,-8]],gold,P.light);}
 else if(kind==='boomerang'){poly(c,[[-26,-15],[-4,-21],[26,15],[14,25],[-7,-4],[-26,-1]],P.bone,P.wood);poly(c,[[-4,-21],[26,15],[14,25],[-7,-4]],gold);}
 else if(kind==='saw'||kind==='ring'){const pts=[];for(let i=0;i<16;i++){const a=i/16*TAU,r=kind==='saw'?(i%2?18:27):24;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(c,pts,kind==='saw'?P.steel:gold,P.wood);gem(c,0,0,13,P.ink,P.wood);}
 else if(kind==='moth'){poly(c,[[-4,-6],[-28,-26],[-25,7],[-6,20]],green,P.bone);poly(c,[[4,-6],[28,-26],[25,7],[6,20]],green,P.bone);gem(c,0,-1,24,gold);}
 else if(kind==='paw'){oval(c,0,11,17,14,P.gold);for(const [x,y] of [[-21,-8],[-8,-20],[9,-20],[22,-7]])oval(c,x,y,7,10,P.bone);}
 else if(kind==='crown'){poly(c,[[-27,20],[-28,-17],[-12,-5],[0,-27],[13,-5],[28,-17],[25,20]],gold,P.wood);gem(c,0,9,9,P.light,P.bone);}
 else{poly(c,[[0,-29],[27,0],[0,28],[-27,0]],P.wood,gold);line(c,[[-9,-12],[8,-4],[-8,6],[8,15]],P.bone,3);}
 c.restore();return kind;
}
function preload(){for(const id of Object.keys(HEROES))model('heroes',id,0);return Promise.resolve();}
const pigments=new Map();
function pigment(color){
 if(pigments.has(color))return pigments.get(color);
 let value={main:'#bc9a62',light:'#e8d6a0',dark:'#725c3b'};
 if(/^#[\da-f]{6}$/i.test(color)){
  const n=parseInt(color.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;
  if(b>r*1.2&&g>r*1.25)value={main:'#78c3d6',light:'#d6f0ec',dark:'#4c7275'};
  else if(b>r*1.2&&b>g*1.1)value={main:'#b296d4',light:'#ead5ed',dark:'#55465f'};
  else if(g>r*1.1&&g>b*1.2)value={main:'#b0cb69',light:'#e0eaa8',dark:'#4e6542'};
  else if(r>g*1.3)value={main:'#e3a260',light:'#f3dfac',dark:'#75503d'};
 }
 pigments.set(color,value);return value;
}
function drawProjectile(c,x,y,size,color,shape='circle',angle=0,evolved=false){
 const d=pigment(color),s=Math.max(.5,size);c.save();c.translate(x,y);c.rotate(angle);
 if(evolved){c.save();c.globalAlpha*=.13;const points=[];for(let i=0;i<8;i++)points.push([Math.cos(i*TAU/8)*s*2,Math.sin(i*TAU/8)*s*2]);poly(c,points,d.main);c.restore();}
 if(['bolt','rocket','sting','needle','arrow'].includes(shape)){
  c.save();c.globalAlpha*=.26;poly(c,[[-s*3.2,0],[-s,-s*.7],[s*.3,0],[-s,s*.7]],d.dark);c.restore();
  poly(c,[[s*1.8,0],[-s,-s*.65],[-s*.45,0],[-s,s*.65]],d.main);poly(c,[[s*1.8,0],[-s,-s*.65],[-s*.45,0]],d.light);
 }else if(['crescent','slash'].includes(shape)){
  poly(c,[[s*.4,-s*1.6],[s*1.1,-s*.7],[s*1.3,s*.1],[s*.9,s],[s*.1,s*1.5],[s*.5,s*.1]],d.main);line(c,[[s*.4,-s*1.6],[s*1.1,-s*.7],[s*1.3,s*.1],[s*.9,s]],d.light,Math.max(.8,s*.16));
 }else if(shape==='boomerang'){poly(c,[[-s*1.8,-s*.8],[-s*.3,-s*1.1],[s*1.8,s*.8],[s*.9,s*1.3],[-s*.5,-s*.2],[-s*1.8,0]],d.main,d.light);}
 else if(shape==='cloud'){c.globalAlpha*=.5;for(const [px,py,r] of [[-s*.6,0,s],[s*.6,-s*.3,s*.8],[s*.2,s*.7,s*.7]])poly(c,[[px-r,py],[px-r*.5,py-r],[px+r*.6,py-r*.8],[px+r,py+r*.3],[px,py+r]],d.main);}
 else if(shape==='flask'){poly(c,[[-s*.4,-s*1.3],[s*.4,-s*1.3],[s*.4,-s*.4],[s,s*.4],[s*.7,s*1.1],[-s*.8,s*1.1],[-s,s*.3],[-s*.4,-s*.4]],d.main,d.light);}
 else if(shape==='saw'){const points=[];for(let i=0;i<16;i++){const a=i*TAU/16,r=s*(i%2?.72:1.2);points.push([Math.cos(a)*r,Math.sin(a)*r]);}poly(c,points,P.steel,P.bone);gem(c,0,0,s*.4,d.dark);}
 else if(shape==='singularity'){const points=[];for(let i=0;i<6;i++)points.push([Math.cos(i*TAU/6)*s*1.25,Math.sin(i*TAU/6)*s*1.25]);poly(c,points,d.dark,d.main);gem(c,0,0,s*.6,P.ink,d.main);}
 else{gem(c,0,0,s*1.3,d.main,d.light);}
 c.restore();
}
function drawArea(c,x,y,r,color,time=0){
 const d=pigment(color);c.save();c.translate(x,y);c.globalAlpha*=.18;
 const points=[];for(let i=0;i<12;i++){const a=i*TAU/12,k=i%3===0?.84:.96;points.push([Math.cos(a)*r*k,Math.sin(a)*r*k]);}poly(c,points,d.main);
 c.globalAlpha*=2;c.strokeStyle=d.main;c.lineWidth=1;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
 for(let i=0;i<4;i++){const a=i*TAU/4+time*.06;gem(c,Math.cos(a)*r*.78,Math.sin(a)*r*.78,Math.min(7,r*.08),d.main,d.light);}
 c.restore();
}
function drawGem(c,x,y,size){c.save();gem(c,x,y,size,'#b7d976','#eff2bd');c.restore();}
function drawPickup(c,x,y,type,alpha=1){
 const icons={magnet:'bell',bomb:'flame',potion:'flask',chest:'chest',evolution_core:'crystal',weapon_altar:'sword',merchant:'coin',grass:'leaf',teleporter:'rune',heal_shrine:'leaf',power_shrine:'sword',speed_shrine:'feather',shield_orb:'shield',xp_orb:'book',lucky_coin:'coin',trap:'thorn'};
 c.save();c.globalAlpha*=alpha;oval(c,x,y+9,15,5,P.shadow);
 if(type==='chest'){
  c.translate(x,y);poly(c,[[-15,-10],[-11,-18],[13,-18],[17,-9],[17,11],[-16,11]],P.wood,P.gold);poly(c,[[-15,-10],[17,-9],[13,-18],[-11,-18]],'#96784c');line(c,[[-15,-1],[17,-1]],P.gold,2);gem(c,1,0,5,P.light);
 }else drawIcon(c,icons[type]||'rune',x-17,y-20,34);
 c.restore();
}
function drawSentry(c,t,time=0){
 c.save();c.translate(t.x,t.y);oval(c,0,5,16,6,P.shadow);
 poly(c,[[-15,3],[-10,-6],[9,-6],[16,3],[8,9],[-8,9]],'#56624d');poly(c,[[-6,-2],[-5,-23],[5,-23],[6,-2]],'#74765b');
 lantern(c,0,-27,.88);poly(c,[[-10,-39],[0,-47],[10,-39]],P.wood,P.gold);
 c.fillStyle='#17271c';c.fillRect(-12,12,24,3);c.fillStyle=t.hp/t.maxHp>.5?P.gold:'#b77b58';c.fillRect(-12,12,24*Math.max(0,t.hp/t.maxHp),3);
 if(t.lastTarget&&time-t.lastShootTime<.15){c.globalAlpha*=1-(time-t.lastShootTime)/.15;line(c,[[0,-24],[t.lastTarget.x-t.x,t.lastTarget.y-t.y]],P.light,1.2);}
 c.restore();
}
function drawCompanion(c,pet){
 const r=pet.def?.radius||10;c.save();c.translate(pet.x,pet.y);if(Math.cos(pet.angle||0)<0)c.scale(-1,1);c.scale(r/10,r/10);
 oval(c,0,5,14,4,P.shadow);
 if(pet.type==='dog'){
  const step=Math.sin((pet.timer||0)*9)*2;
  line(c,[[-9,-1],[-11,9+step]],'#6b6749',4);line(c,[[9,-1],[11,9-step]],'#6b6749',4);
  poly(c,[[-14,-2],[-13,-14],[2,-18],[14,-9],[12,4],[-5,5]],'#8f8d61',P.ink);poly(c,[[-13,-14],[2,-18],[9,-12],[-8,-7]],'#b7b389');
  poly(c,[[4,-8],[7,-25],[19,-27],[23,-13],[18,-6]],'#9d9a70',P.ink);poly(c,[[8,-23],[7,-35],[15,-27]],P.wood);poly(c,[[19,-26],[24,-35],[24,-20]],P.wood);gem(c,18,-20,2,P.light);line(c,[[-13,-10],[-23,-19],[-24,-29]],'#8f8d61',4);
  poly(c,[[-8,-15],[1,-17],[2,-2],[-6,0]],P.wood,P.gold);
 }else if(pet.type==='medic'){
  poly(c,[[-3,-12],[-23,-25],[-19,-5],[-5,1]],'#789274',P.bone);poly(c,[[3,-12],[23,-25],[19,-5],[5,1]],'#789274',P.bone);gem(c,0,-13,14,'#b6c590',P.boneLight);
 }else{
  poly(c,[[-5,-18],[-23,-27],[-20,-8],[-7,-2]],'#927f54');poly(c,[[5,-18],[23,-27],[20,-8],[7,-2]],'#927f54');lantern(c,0,-9,.85);gem(c,0,-33,5,P.gold);
 }
 c.restore();
}
module.exports={preload,drawHero,drawPortrait,drawMonster,drawBoss,drawIcon,drawProjectile,drawArea,drawGem,drawPickup,drawSentry,drawCompanion,pigment,iconKey,HEROES,MONSTERS,BOSSES,P,cache};
