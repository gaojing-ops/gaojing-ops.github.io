// Shared native art, matching the first courtyard. Gameplay IDs remain unchanged.
const Facets=require('./FacetedArt');
module.exports={...Facets,...require('./BattleArt'),...require('./NightMagic'),...require('./WeaponArt'),HEROES:Object.keys(Facets.HEROES),MONSTERS:Object.keys(Facets.MONSTERS)};
