"""Create game routes over the retained MDT map/position reference, with explicit corridor waypoints.
Routes are compact gameplay selections, not exported or premium player routes.
"""
import json,math
from pathlib import Path
SOURCE=json.loads(Path('games/keystone/maps/source.json').read_text(encoding='utf-8'))
def T(x,y,area,via=None):return {'x':x,'y':y,'area':area,'kind':'trash','via':via or []}
def B(name,area,via=None,display=None):return {'bossName':name,'area':area,'kind':'boss','via':via or [],'display':display or name}
CONFIG={
'fangs':[
 T(135,180,'卡希加拉前厅'),T(135,275,'仪式长廊'),T(135,365,'拉维密室'),B("Rav'i",'拉维密室'),
 T(230,460,'蜿蜒洞窟',[[120,500],[180,520]]),T(320,325,'洞窟上坡',[[270,400]]),T(445,370,'盘卷之厅',[[370,330]]),B('The Writhing Coil','盘卷之厅'),
 T(600,510,'祭坛下层',[[505,480]]),T(755,470,'阿曼尼祭坛',[[700,530]]),T(755,245,'祭坛阶梯',[[755,370]]),B("Zul'jan",'祖尔加祭坛',[[755,145],[680,145]])],
'murder':[
 T(765,450,'密谋小径入口'),T(685,405,'银月街巷',[[730,405]]),T(675,335,'法力庭院'),B('Kystia Manaheart','法力庭院'),
 T(575,320,'酒馆外街',[[620,310]]),T(515,355,'密谋集市'),T(435,310,'林荫圆庭',[[450,350]]),B('Zaen Bladesorrow','林荫圆庭'),
 T(410,375,'南侧小径',[[440,335]]),T(345,430,'奥古尔平台'),T(290,490,'毁灭者之阶'),B('Xathuux the Annihilator','毁灭者平台'),
 T(200,425,'西侧回廊',[[235,520]]),T(185,300,'焰怒花园',[[175,365]]),T(235,160,'北侧阶梯',[[235,235]]),B('Lithiel Cinderfury','焰怒终庭',[[235,100]])],
'nalorakk':[
 T(80,340,'纳洛拉克洞口'),T(135,410,'祭品小径',[[90,390]]),T(215,425,'贪藏者洞窟'),B('The Hoardmonger','贪藏者洞窟'),
 T(290,320,'山腹坡道'),T(245,265,'寒冬洞窟'),T(240,205,'寒冬洞窟'),B('Sentinel of Winter','寒冬洞窟'),
 T(340,190,'冰桥',[[290,185]]),T(445,215,'山间河道'),T(590,165,'祖灵石阶',[[520,190]]),B('Nalorakk','纳洛拉克神殿',[[645,150]])],
'vale':[
 T(85,270,'夺目谷入口'),T(200,185,'北侧林道',[[135,220]]),T(325,120,'虫巢坡道'),B('Meittik','虫巢'),
 T(470,160,'林冠小径'),T(520,245,'花谷支路',[[505,190]]),T(465,335,'光猎者巢穴',[[520,300]]),B('Ikuzz the Light Hunter','光猎者巢穴'),
 T(540,340,'东侧根径'),T(665,300,'光守者石阶'),T(760,250,'光守者平台'),B('Lightwarden Ruia','光守者平台'),
 T(750,340,'南侧崖道'),T(570,420,'古树环道',[[660,395]]),T(340,390,'溪流坡道',[[450,420]]),B('Ziekket','溪流圆环',[[255,350]])],
'arena':[
 T(200,485,'竞技场入口'),T(270,430,'入场回廊',[[240,475]]),T(200,330,'西侧竞技场',[[295,360],[230,345]]),B("Taz'Rah",'塔兹拉竞技场'),
 T(285,200,'竞技场上环',[[200,175]]),T(450,265,'连接长桥',[[350,210],[400,250]]),T(600,385,'东侧阶梯',[[525,305],[610,335]]),B('Atroxus','阿特罗克斯竞技场'),
 T(745,430,'东侧环道',[[700,480]]),T(745,315,'竞技场看台'),T(680,275,'卡洛努斯竞技场',[[710,275]]),B('Charonus','卡洛努斯竞技场')],
'kings':[
 T(805,335,'黄金走廊'),T(800,390,'黄金大厅'),T(775,425,'黄金大厅'),B('The Golden Serpent','黄金大厅'),
 T(750,285,'亡者大厅',[[750,350]]),T(650,265,'墓穴长廊'),T(515,220,'防腐密室',[[540,265]]),B('Mchimba the Embalmer','防腐密室',[[485,180]]),
 T(485,300,'王庭下阶',[[485,220]]),T(470,410,'部族王庭'),T(405,475,'部族议会'),B("Aka'ali the Conqueror",'部族议会',display='The Council of Tribes'),
 T(325,390,'先王之路'),T(300,300,'王墓长廊'),T(180,290,'始皇墓室'),B('King Dazar','达萨之墓')],
'temple':[
 T(705,510,'蛇庙入口'),T(660,500,'祭仪石阶'),T(645,470,'双蛇平台'),B('Adderis','阿德里斯与阿斯匹克斯',display='Adderis & Aspix'),
 T(560,435,'蜿蜒石窟',[[600,460]]),T(475,380,'通往蛇巢',[[500,425]]),T(440,300,'米利克萨巢穴'),B('Merektha','米利克萨巢穴'),
 T(500,235,'闪电长廊',[[485,255]]),T(520,180,'雷电平台'),T(465,155,'加瓦兹特平台'),B('Galvazzt','加瓦兹特平台'),
 T(345,265,'蛇眼回廊',[[380,200]]),T(240,330,'塞塔里斯之眼',[[300,325]]),T(95,210,'神灵石阶',[[145,300],[95,270]]),B('Avatar of Sethraliss','塞塔里斯神殿',[[95,135]])],
'ruby':[
 T(115,445,'注能大厅'),T(110,345,'红玉孵化池'),T(190,240,'寒妆前厅',[[110,260]]),B('Melidrussa Chillworn','红玉孵化池'),
 T(810,260,'红玉高台',[[750,190]]),T(820,455,'高台环道',[[825,355]]),T(650,580,'高台巡逻',[[810,540],[740,580]]),B('Kokia Blazehoof','高台上坡',[[540,560],[480,480],[480,355]]),
 T(410,150,'龙族回廊',[[445,195]]),T(330,95,'仪式平台'),T(275,65,'风脉平台'),B('Kyrakka','红玉之巅',display='Kyrakka & Erkhart Stormvein')]
}
result={}
for key,nodes in CONFIG.items():
 ref=SOURCE['dungeons'][key];boss_index=0
 for node in nodes:
  if node['kind']=='boss':
   raw=next(b for b in ref['bosses'] if b['name']==node['bossName']);node.update(x=round(raw['x'],2),y=round(raw['y'],2),bossIndex=boss_index);boss_index+=1
  else:
   nearest=min(ref['packs'],key=lambda p:math.hypot(node['x']-p['x'],node['y']-p['y'])) if ref['packs'] else None
   node['enemies']=nearest['names'][:3] if nearest else ['Dungeon guard'];node['packGroup']=nearest['group'] if nearest else None
  node['x']=round(node['x'],2);node['y']=round(node['y'],2)
  node['via']=[{'x':p[0],'y':p[1]} for p in node['via']]
 if key=='ruby':nodes[4]['transport']={'x':630,'y':190,'label':'乘坐龙骑前往红玉高台'}
 result[key]={'width':1000,'height':666.6667,'image':'/games/keystone/maps/'+key+'-1.webp','entrance':ref['entrance'],'bosses':[n['display'] for n in nodes if n['kind']=='boss'],'route':nodes,'sourceCommit':SOURCE['commit']}
Path('games/keystone/maps.js').write_text('// Routes authored for this game over the pinned MDT atlas reference. See maps/README.md.\nexport const DUNGEON_MAPS = '+json.dumps(result,ensure_ascii=False,indent=2)+';\nexport const getMap = id => DUNGEON_MAPS[id];\n',encoding='utf-8')
print('Built '+str(len(result))+' distinct atlas routes')
