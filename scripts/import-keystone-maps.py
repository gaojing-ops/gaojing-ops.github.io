from urllib.request import urlopen
from pathlib import Path
import zipfile,io,json,re,subprocess
from PIL import Image
sha=subprocess.check_output(['gh','api','repos/Nnoggie/MythicDungeonTools/commits/master','--jq','.sha'],text=True).strip()
print('Pinned MDT source '+sha,flush=True)
url='https://codeload.github.com/Nnoggie/MythicDungeonTools/zip/'+sha
payload=urlopen(url,timeout=90).read()
archive=zipfile.ZipFile(io.BytesIO(payload));root=archive.namelist()[0].split('/')[0]+'/'
names={'fangs':'AltarOfFangs','murder':'MurderRow','nalorakk':'DenOfNalorakk','vale':'TheBlindingVale','arena':'VoidscarArena','kings':'KingsRest','temple':'TempleOfSethraliss','ruby':'RubyLifePools'}
metadata={'source':'https://github.com/Nnoggie/MythicDungeonTools','commit':sha,'atlasWidth':1000,'atlasHeight':666.6667,'dungeons':{}}
for key,name in names.items():
 raw=archive.read(root+'Midnight/'+name+'.lua').decode()
 source_dir=Path('games/keystone/vendor/mdt-source');source_dir.mkdir(parents=True,exist_ok=True);(source_dir/(name+'.lua')).write_text(raw,encoding='utf-8')
 sections=re.split(r'(?m)^  \[(\d+)\] = \{',raw.split('MDT.dungeonEnemies[dungeonIndex] = {',1)[1])
 bosses=[];packs={}
 for i in range(1,len(sections)-1,2):
  block=sections[i+1];npc=re.search(r'\["name"\] = "([^"]+)"',block);coord=re.search(r'\["x"\] = ([\d.-]+),\s*\["y"\] = ([\d.-]+)',block)
  if not npc or not coord:continue
  if '["isBoss"] = true' in block:
   encounter=re.search(r'\["encounterID"\] = (\d+)',block)
   bosses.append({'name':npc[1],'encounter':int(encounter[1]) if encounter else int(sections[i]),'x':float(coord[1]),'y':-float(coord[2])})
  else:
   clones=block.split('["clones"] = {',1)[-1]
   for match in re.finditer(r'\["x"\] = ([\d.-]+),\s*\["y"\] = ([\d.-]+),(?P<tail>.*?)(?=\n      \},)',clones,re.S):
    group=re.search(r'\["g"\] = (\d+)',match['tail']);sub=re.search(r'\["sublevel"\] = (\d+)',match['tail'])
    if group and (not sub or sub[1]=='1'):packs.setdefault(int(group[1]),[]).append({'x':float(match[1]),'y':-float(match[2]),'name':npc[1]})
 entrance=re.search(r'\["type"\] = "dungeonEntrance",\s*\["x"\] = ([\d.-]+),\s*\["y"\] = ([\d.-]+)',raw)
 floors=sorted({int(re.search(r'/(\d+)_\d+\.png$',f)[1]) for f in archive.namelist() if f.startswith(root+'Midnight/Textures/'+name+'/') and re.search(r'/(\d+)_\d+\.png$',f)})
 for floor in floors:
  first=Image.open(io.BytesIO(archive.read(root+f'Midnight/Textures/{name}/{floor}_1.png'))).convert('RGBA');w,h=first.size
  canvas=Image.new('RGBA',(w*15,h*10))
  for index in range(1,151):
   tile=Image.open(io.BytesIO(archive.read(root+f'Midnight/Textures/{name}/{floor}_{index}.png'))).convert('RGBA');canvas.paste(tile,(((index-1)%15)*w,((index-1)//15)*h))
  canvas.resize((1500,1000),Image.Resampling.LANCZOS).convert('RGB').save(Path('games/keystone/maps')/f'{key}-{floor}.webp',quality=87)
 metadata['dungeons'][key]={'file':name,'floors':floors,'entrance':{'x':float(entrance[1]),'y':-float(entrance[2])} if entrance else None,'bosses':bosses,'packs':[{'group':group,'x':sum(n['x'] for n in npcs)/len(npcs),'y':sum(n['y'] for n in npcs)/len(npcs),'names':list(set(n['name'] for n in npcs))} for group,npcs in sorted(packs.items())]}
 print(key+' floors='+str(floors)+' bosses='+str([(b['name'],round(b['x']),round(b['y'])) for b in bosses]),flush=True)
Path('games/keystone/vendor/MDT-LICENSE.txt').write_bytes(archive.read(root+'LICENSE'))
Path('games/keystone/maps/source.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
Path('games/keystone/vendor/NOTICE.txt').write_text('Map atlases and placement reference: Mythic Dungeon Tools, '+sha+'\nhttps://github.com/Nnoggie/MythicDungeonTools\nMDT distributed under GPL-2.0; see MDT-LICENSE.txt.\nWorld of Warcraft game maps/artwork are copyright Blizzard Entertainment.\nAtlas tiles assembled and resized to WebP for this project on 2026-10-30.\nOriginal gameplay implementation is available in this public repository.\n',encoding='utf-8')
