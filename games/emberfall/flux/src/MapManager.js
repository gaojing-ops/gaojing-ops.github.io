const Art=require('./Art');
const {WorldScenery,PALETTES}=require('./WorldScenery');
class MapManager{
 constructor(){this.style='CyberGrid';this.loaded=false;this.scenery=new WorldScenery();}
 async preloadImages(){await Art.preload();this.loaded=true;}
 setStyle(style){this.style=PALETTES[style]?style:'CyberGrid';this.scenery.setStyle(this.style);}
 draw(ctx,camX,camY,w,h,dt){this.scenery.drawGround(ctx,camX,camY,w,h,dt);}
 visibleProps(camX,camY,w,h,player){return this.scenery.visibleProps(camX,camY,w,h,player);}
 updateStyleByTime(gameTime){const styles=['CyberGrid','VoidNebula','Matrix','CryoRealm','ToxicSwamp'];this.setStyle(styles[Math.floor(gameTime/240)%styles.length]);}
 getConfig(){return this.scenery.palette;}
}
module.exports=MapManager;
