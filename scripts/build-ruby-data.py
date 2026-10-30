from pathlib import Path
import re,json
s=Path('games/keystone/vendor/mdt-source/RubyLifePools.lua').read_text(encoding='utf-8')
a=s.index('MDT.dungeonEnemies[dungeonIndex] = ')+len('MDT.dungeonEnemies[dungeonIndex] = ')
tokens=re.findall(r'"(?:\\.|[^"\\])*"|\d+(?:\.\d+)?|true|false|nil|[{}\[\]=,;-]',s[a:])
i=0
def value():
 global i
 t=tokens[i];i+=1
 if t=='{':
  d={};n=1
  while tokens[i]!='}':
   if tokens[i] in [',',';']:i+=1;continue
   if tokens[i]=='[':
    i+=1;k=value();i+=2;v=value()
   else:k=n;n+=1;v=value()
   d[k]=v
  i+=1;return d
 if t=='-':return -value()
 if t.startswith('"'):return json.loads(t)
 if t in ['true','false','nil']:return {'true':True,'false':False,'nil':None}[t]
 return float(t) if '.' in t else int(t)
data=value();maps=Path('games/keystone/maps.js').read_text(encoding='utf-8');m=json.loads(maps[maps.index('{'):maps.rindex('};')+1])['ruby'];route=m['route']
groups={};boss_names=['Melidrussa Chillworn','Kokia Blazehoof','Kyrakka','Erkhart Stormvein']
for npc in data.values():
 if npc['name'] in boss_names:continue
 for key,c in npc.get('clones',{}).items():
  x,y=c['x'],-c['y'];near=min(range(len(route)),key=lambda j:(x-route[j]['x'])**2+(y-route[j]['y'])**2)
  stage=0 if near<=3 else 1 if near<=7 else 2
  gid=str(c.get('g',f"solo-{npc['id']}-{key}"));gid=f'{stage}-{gid}'
  g=groups.setdefault(gid,{'id':gid,'stage':stage,'members':[],'anchor':near})
  g['members'].append({'id':f"{npc['id']}-{key}",'npcId':npc['id'],'name':npc['name'],'x':round(x,2),'y':round(y,2),'forces':npc.get('count',0),'spells':list(npc.get('spells',{}))})
for g in groups.values():
 g['x']=round(sum(v['x'] for v in g['members'])/len(g['members']),2);g['y']=round(sum(v['y'] for v in g['members'])/len(g['members']),2)
 g['forces']=sum(v['forces'] for v in g['members']);g['name']=g['members'][0]['name'];g['danger']='施法怪：优先打断' if any(v['spells'] for v in g['members']) else '近战承伤'
result={'totalForces':551,'groups':list(groups.values()),'sourceCommit':m['sourceCommit']}
Path('games/keystone/ruby-data.js').write_text('// Generated from retained MDT Lua. Regenerate with scripts/build-ruby-data.py.\nexport const RUBY_DATA='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Ruby groups',len(groups),'monsters',sum(len(g['members']) for g in groups.values()),'forces',sum(g['forces'] for g in groups.values()))
