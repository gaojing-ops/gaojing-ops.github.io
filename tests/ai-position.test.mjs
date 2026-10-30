import test from 'node:test';
import assert from 'node:assert/strict';
import {Run} from '../games/keystone/engine.js';
import {DEFAULT_TEAM,spec} from '../games/keystone/data.js';
import {dist,navigable} from '../games/keystone/routes.js';
function cornerEncounter(){const r=new Run({team:DEFAULT_TEAM,dungeon:'fangs',seed:123});r.spawn();r.enemies=r.enemies.slice(0,1);const e=r.enemies[0];e.hp=e.maxHp=1e6;r.heroes[0].x=e.x-12;r.heroes[0].y=e.y;for(const h of r.heroes.slice(1)){h.x=e.x;h.y=e.y;}return r;}
test('ranged and healer fallback chooses a reachable stand-off point in a narrow corridor',()=>{const r=cornerEncounter(),e=r.enemies[0];for(const h of [r.heroes[1],r.heroes[2],r.heroes[3]]){const p=r.rangedPosition(h,e,r.heroes[0]);assert.ok(p,h.id);assert.ok(navigable(r.dungeon,p,35));assert.ok(dist(p,e)>=35);assert.ok(r.range(p,e,spec(h.id).attackRange));}});
test('ranged and healer leave a monster overlap and resume useful actions',()=>{const r=cornerEncounter(),e=r.enemies[0];for(let i=0;i<250;i++)r.update(.04);for(const h of [r.heroes[1],r.heroes[2],r.heroes[3]]){assert.ok(dist(h,e)>25,h.id+' must not remain at monster centre');assert.ok(h.damage+h.healing>0,h.id+' must contribute');}});
test('healer detail targets the ally actually being healed',()=>{const r=cornerEncounter(),h=r.heroes[1],tank=r.heroes[0];tank.hp=tank.maxHp*.3;h.skillCd=999;r.update(.04);assert.equal(h.target,tank.id);});
