"""Refresh a bounded public Raider.IO reference snapshot; no login or runtime dependency."""
import json
from pathlib import Path
from urllib.request import Request,urlopen
from datetime import datetime,timezone
BASE='https://raider.io/api/v1/'
def get(path):
 with urlopen(Request(BASE+path,headers={'User-Agent':'KeystonePrototype/0.1 public reference'}),timeout=25) as response:
  return json.load(response)
data=get('mythic-plus/static-data?expansion_id=11')
season=next(s for s in data['seasons'] if s['slug']=='season-mn-2')
run=get('mythic-plus/run-details?season=season-mn-2&id=23564503')
roster=[{'classSlug':r['character']['class']['slug'],'specSlug':r['character']['spec']['slug'],'specId':r['character']['spec']['id'],'role':r['role'],'region':r['character']['region']['slug']} for r in run['roster']]
assert len(roster)==5 and all(r['region']=='cn' for r in roster)
assert sum(r['role']=='tank' for r in roster)==1 and sum(r['role']=='healer' for r in roster)==1
snapshot={'source':'Raider.IO public API','fetchedAt':datetime.now(timezone.utc).isoformat(),'season':season['slug'],'cnStartsAt':season['starts']['cn'],'staticUrl':BASE+'mythic-plus/static-data?expansion_id=11','dungeons':[{k:d[k] for k in ['id','slug','name','short_name','keystone_timer_seconds']} for d in season['dungeons']],
 'example':{'url':'https://raider.io/mythic-plus-runs/season-mn-2/23564503-24-den-of-nalorakk','apiUrl':BASE+'mythic-plus/run-details?season=season-mn-2&id=23564503','region':'cn','level':run['mythic_level'],'dungeonSlug':run['dungeon']['slug'],'clearTimeMs':run['clear_time_ms'],'completedAt':run['completed_at'],'roster':roster},
 'limitations':'One public CN run is an example, not a population statistic or spec tier list. Game damage, loot, affixes and encounters use original simplified rules.'}
target=Path(__file__).resolve().parents[1]/'games/keystone/raider-reference.js'
target.write_text('// Public metadata snapshot; refresh with scripts/update-keystone-reference.py\nexport const RAIDER_REFERENCE = '+json.dumps(snapshot,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(json.dumps({'season':snapshot['season'],'dungeons':len(snapshot['dungeons']),'roster':roster},ensure_ascii=True))
