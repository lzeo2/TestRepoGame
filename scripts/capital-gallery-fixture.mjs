// Explicit source-domain fixture placement, not naturally travelled gameplay.
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {createInteriorCollider} from '../Games/Capital Drive/interior-navigation.js';
export function createGalleryFixture(site = {
  id:'memorial-workshop',kind:'memorial',name:'War Memorial Gallery',yaw:0,width:11,depth:8.4,floor:0,
  point:(across,forward)=>({x:3000-across,z:-forward})
}, exits = [
  {id:'main',name:'Public approach',...site.point(0,-2.05)},
  {id:'side',name:'Public pickup',...site.point(0,-8)}
]) {
  const interiors=createInteriors({buildings:[]},{heightAt:()=>site.floor,heistSites:[site]});
  const actor={...site.point(0,-2.05),yaw:site.yaw};
  const plan=interiors.enter(interiors.entries[0],actor);
  if(!plan?.heist?.anchors)throw new Error('Gallery fixture requires the actual authored room anchors.');
  return {interiors,actor,plan,collider:createInteriorCollider(plan),
    gallery:{roomId:plan.id,points:plan.heist.anchors,exits}};
}
