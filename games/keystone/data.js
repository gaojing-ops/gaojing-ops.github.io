import {RAIDER_REFERENCE} from './raider-reference.js';
export {RAIDER_REFERENCE};
export const SEASON={name:'至暗之夜 · 第 2 赛季',region:'国服正式服',asOf:'2026-10-30',source:'https://wow.blizzard.cn/news/24294369/index.html'};
const BASE_DUNGEONS=[
 {id:'fangs',name:'毒牙祭坛',theme:'毒雾回廊',color:'#91c57d',floor:'#172b26',hazard:'poison',bosses:['祭坛守卫','毒牙祭司','深渊之影']},
 {id:'murder',name:'密谋小径',theme:'潜伏的街巷',color:'#bca0e9',floor:'#262239',hazard:'shadow',bosses:['暗巷哨兵','密谋者','夜幕执政官']},
 {id:'nalorakk',name:'纳洛拉克的洞穴',theme:'兽魂与石窟',color:'#cfaa76',floor:'#2d2920',hazard:'quake',bosses:['洞穴猎手','兽魂卫士','洞窟领主']},
 {id:'vale',name:'夺目谷',theme:'繁花深处',color:'#d5be7a',floor:'#293021',hazard:'bloom',bosses:['花谷守护者','棘刺之心','耀光化身']},
 {id:'arena',name:'虚空之痕竞技场',theme:'裂隙与星尘',color:'#ad9bea',floor:'#20233a',hazard:'void',bosses:['裂隙斗士','虚空织法者','竞技场霸主']},
 {id:'kings',name:'诸王之眠',theme:'古老王庭',color:'#dfb96e',floor:'#2d2823',hazard:'ritual',bosses:['黄金卫士','王庭祭司','不朽王魂']},
 {id:'temple',name:'塞塔里斯神庙',theme:'雷霆长廊',color:'#86c8d6',floor:'#19303a',hazard:'storm',bosses:['雷鳞卫士','风暴祭司','神庙化身']},
 {id:'ruby',name:'红玉新生法池',theme:'熔火与龙焰',color:'#ef9a77',floor:'#35251f',hazard:'fire',bosses:['红玉守卫','熔火统领','龙焰化身']}
];
const RIO_SLUGS={fangs:'altar-of-fangs',murder:'murder-row',nalorakk:'den-of-nalorakk',vale:'the-blinding-vale',arena:'voidscar-arena',kings:'kings-rest',temple:'temple-of-sethraliss',ruby:'ruby-life-pools'};
export const DUNGEONS=BASE_DUNGEONS.map(d=>{const reference=RAIDER_REFERENCE.dungeons.find(r=>r.slug===RIO_SLUGS[d.id]);return {...d,rioSlug:reference.slug,referenceTimer:reference.keystone_timer_seconds,gameTimer:Math.round(reference.keystone_timer_seconds/10)};});
// Dungeon names follow the published rotation. Encounters, routes and numerical rules are original compact adaptations.
export const SPECS=[
 {id:'paladin-holy',job:'圣骑士',name:'神圣',role:'heal',color:'#eea5ca',mark:'圣',hp:330,power:36,armor:.23,skill:'圣光震击',kind:'burstheal'},
 {id:'warrior-arms',job:'战士',name:'武器',role:'dps',color:'#c4a078',mark:'战',hp:345,power:53,armor:.24,skill:'巨人打击',kind:'burst'},
 {id:'shaman-elemental',job:'萨满祭司',name:'元素',role:'dps',color:'#82b0e8',mark:'萨',hp:310,power:52,armor:.2,skill:'闪电链',kind:'cleave'},
 {id:'rogue-subtlety',job:'潜行者',name:'敏锐',role:'dps',color:'#e6cf79',mark:'贼',hp:295,power:54,armor:.17,skill:'暗影之舞',kind:'burst'},
 {id:'paladin-prot',job:'圣骑士',name:'防护',role:'tank',color:'#eea5ca',mark:'圣',hp:520,power:27,armor:.42,skill:'正义盾击',kind:'shield'},
 {id:'warrior-prot',job:'战士',name:'防护',role:'tank',color:'#c4a078',mark:'战',hp:580,power:25,armor:.44,skill:'盾牌格挡',kind:'block'},
 {id:'dk-blood',job:'死亡骑士',name:'鲜血',role:'tank',color:'#da7683',mark:'死',hp:560,power:28,armor:.36,skill:'灵界打击',kind:'leech'},
 {id:'druid-guardian',job:'德鲁伊',name:'守护',role:'tank',color:'#edab68',mark:'德',hp:650,power:24,armor:.39,skill:'铁鬃',kind:'shield'},
 {id:'priest-holy',job:'牧师',name:'神圣',role:'heal',color:'#ecede2',mark:'牧',hp:285,power:38,armor:.12,skill:'圣言术',kind:'burstheal'},
 {id:'shaman-resto',job:'萨满祭司',name:'恢复',role:'heal',color:'#82b0e8',mark:'萨',hp:310,power:35,armor:.18,skill:'治疗链',kind:'chainheal'},
 {id:'monk-mist',job:'武僧',name:'织雾',role:'heal',color:'#76d4b1',mark:'僧',hp:320,power:34,armor:.17,skill:'复苏之雾',kind:'hot'},
 {id:'druid-resto',job:'德鲁伊',name:'恢复',role:'heal',color:'#edab68',mark:'德',hp:305,power:34,armor:.15,skill:'野性成长',kind:'hot'},
 {id:'mage-frost',job:'法师',name:'冰霜',role:'dps',color:'#87cddd',mark:'法',hp:270,power:53,armor:.1,skill:'冰霜新星',kind:'frost'},
 {id:'hunter-bm',job:'猎人',name:'兽王',role:'dps',color:'#acd582',mark:'猎',hp:320,power:48,armor:.21,skill:'野兽顺劈',kind:'cleave'},
 {id:'rogue-outlaw',job:'潜行者',name:'狂徒',role:'dps',color:'#e6cf79',mark:'贼',hp:300,power:51,armor:.18,skill:'剑刃乱舞',kind:'cleave'},
 {id:'warrior-fury',job:'战士',name:'狂怒',role:'dps',color:'#c4a078',mark:'战',hp:350,power:52,armor:.25,skill:'暴怒',kind:'burst'},
 {id:'warlock-demo',job:'术士',name:'恶魔学识',role:'dps',color:'#bba3ec',mark:'术',hp:310,power:50,armor:.15,skill:'恶魔之力',kind:'burst'},
 {id:'dh-havoc',job:'恶魔猎手',name:'浩劫',role:'dps',color:'#be8dde',mark:'魔',hp:325,power:49,armor:.2,skill:'眼棱',kind:'cleave'},
 {id:'evoker-dev',job:'唤魔师',name:'湮灭',role:'dps',color:'#7ccbbb',mark:'唤',hp:300,power:54,armor:.15,skill:'深呼吸',kind:'burst'}
];
export const DEFAULT_TEAM=['paladin-prot','priest-holy','mage-frost','hunter-bm','rogue-outlaw'];
export const ROLES={tank:'坦克',heal:'治疗',dps:'输出'};
export const SLOTS={weapon:'武器',head:'头部',chest:'胸甲',boots:'鞋子',trinket:'饰品'};
export const QUALITIES={uncommon:{name:'精良',color:'#83c58c',factor:1},rare:{name:'稀有',color:'#81b6ee',factor:1.2},epic:{name:'史诗',color:'#b69aee',factor:1.5}};
export function spec(id){return SPECS.find(s=>s.id===id);}
export function validateTeam(ids){return Array.isArray(ids)&&ids.length===5&&new Set(ids).size===5&&ids.every(id=>spec(id))&&ids.filter(id=>spec(id).role==='tank').length===1&&ids.filter(id=>spec(id).role==='heal').length===1&&ids.filter(id=>spec(id).role==='dps').length===3;}
export function affixes(level){return [level>=4?'强韧':null,level>=7?'暴君':null,level>=10?'涌动':null].filter(Boolean);}
export function stats(id,equipment={}){
 const s=spec(id);const result={maxHp:s.hp,power:s.power,armor:s.armor,haste:0,crit:.08,ilvl:0};let count=0;
 for(const item of Object.values(equipment)){if(!item)continue;result.maxHp+=item.stamina||0;result.power+=item.power||0;result.haste+=item.haste||0;result.crit+=item.crit||0;result.ilvl+=item.ilvl||0;count++;}
 result.ilvl=count?Math.round(result.ilvl/count):0;result.haste=Math.min(.55,result.haste);result.crit=Math.min(.6,result.crit);return result;
}
export function itemScore(item,id){if(!item||(item.role!=='all'&&item.role!==spec(id).role))return -1;return item.power*2+item.stamina*(spec(id).role==='tank'?.32:.08)+(item.haste+item.crit)*200;}

const RIO_SPECS={250:'dk-blood',65:'paladin-holy',262:'shaman-elemental',261:'rogue-subtlety',71:'warrior-arms'};
export const REFERENCE_TEAM=RAIDER_REFERENCE.example.roster.slice().sort((a,b)=>({tank:0,healer:1,dps:2}[a.role]-{tank:0,healer:1,dps:2}[b.role])).map(r=>RIO_SPECS[r.specId]);
