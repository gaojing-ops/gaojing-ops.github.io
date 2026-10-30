import test from 'node:test';
import assert from 'node:assert/strict';
import {Run} from '../games/keystone/engine.js';
import {DEFAULT_TEAM,spec} from '../games/keystone/data.js';
import {makeItem} from '../games/keystone/rules.js';
function run(dungeon,tier){const equipment=Object.fromEntries(DEFAULT_TEAM.map(id=>[id,Object.fromEntries(['weapon','armor','trinket'].map(slot=>[slot,makeItem({id:id+slot,slot,tier,role:spec(id).role,effect:spec(id).role==='tank'?'shield':spec(id).role==='heal'?'rescue':'single'})]))]));const r=new Run({team:DEFAULT_TEAM,dungeon,level:20,equipment,seed:123});while(!r.result)r.update(.04);return r;}
for(const dungeon of ['kings','ruby'])test(`${dungeon}: +20 is timed with previous-floor uncommon gear`,()=>{const r=run(dungeon,18);assert.ok(r.result.success);assert.ok(r.result.inTime);assert.equal(r.metrics.deaths,0);assert.ok(r.result.loot.every(i=>i.tier===19));});
test('gear improvements overcome the high-key timer; low-tier farming cannot bypass the curve',()=>{const weak=run('ruby',4),strong=run('ruby',18);assert.equal(weak.result.inTime,false);assert.ok(strong.result.inTime);assert.ok(strong.clock<weak.clock*.8);});
