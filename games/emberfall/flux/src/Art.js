// Shared native art, matching the first courtyard. Gameplay IDs remain unchanged.
const Facets=require('./FacetedArt');
module.exports={...Facets,HEROES:Object.keys(Facets.HEROES),MONSTERS:Object.keys(Facets.MONSTERS)};
