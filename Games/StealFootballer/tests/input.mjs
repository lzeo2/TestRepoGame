import assert from 'node:assert/strict';
import {blocksGameplayKey,rememberFocus,restoreFocus,trapTab} from '../js/input.js';

const target=kind=>({closest:selector=>selector.split(',').includes(kind)?{}:null});
for(const key of ['w','ArrowUp','e','f'])assert.equal(blocksGameplayKey({key,target:target('button')}),false);
for(const kind of ['button','a'])for(const key of ['Enter',' '])assert.equal(blocksGameplayKey({key,target:target(kind)}),true);
for(const kind of ['input','select','textarea','[contenteditable="true"]'])assert.equal(blocksGameplayKey({key:'w',target:target(kind)}),true);

const document={activeElement:null,getElementById:id=>elements.find(el=>el.id===id)};
let elements=[];
const element=(id='',position,data={})=>({id,dataset:{position,...data},disabled:false,hidden:false,focus(){document.activeElement=this;}});
const root={ownerDocument:document,contains:el=>elements.includes(el),querySelector:selector=>elements.find(el=>selector===`[data-position="${el.dataset.position}"]`),querySelectorAll:()=>elements};
const fallback=element('close');
for(const [id,position] of [['formation',undefined],['', '3']]) {
  const original=element(id,position);elements=[original];original.focus();
  const token=rememberFocus(root),replacement=element(id,position);elements=[replacement];
  restoreFocus(root,token,fallback);assert.equal(document.activeElement,replacement);
}
elements=[element('removed')];elements[0].focus();const token=rememberFocus(root);
elements=[];restoreFocus(root,token,fallback);assert.equal(document.activeElement,fallback);

for(const data of [
  {action:'ability',id:'slalom'},
  {action:'controlIcon',index:'9'},
  {action:'sell',uid:'player-123'},
  {action:'steal',base:'2',index:'1'},
  {action:'buy',market:'belt-0',id:'saka'},
  {action:'play',id:'unsafe"selector]'}
]) {
  const original=element('',undefined,data);elements=[original];original.focus();
  const remembered=rememberFocus(root),replacement=element('',undefined,data);
  const different=element('',undefined,{...data,index:'99'});
  elements=[different,replacement];restoreFocus(root,remembered,fallback);
  assert.equal(document.activeElement,replacement,'Dataset actions restore the same identity, independent of DOM position');
  replacement.disabled=true;restoreFocus(root,remembered,fallback);
  assert.equal(document.activeElement,fallback,'An action disabled by cooldown falls back to Close');
}
const rival=element('',undefined,{action:'steal',base:'1',index:'2'});elements=[rival];rival.focus();
const rivalToken=rememberFocus(root),otherBase=element('',undefined,{action:'steal',base:'2',index:'2'});
elements=[otherBase];restoreFocus(root,rivalToken,fallback);
assert.equal(document.activeElement,fallback,'Matching slot numbers in different rival clubs never receive focus');

elements=[element('first'),element('last')];
for(const [active,shiftKey,expected] of [[elements[1],false,elements[0]],[elements[0],true,elements[1]],[fallback,false,elements[0]],[fallback,true,elements[1]]]) {
  document.activeElement=active;let prevented=false;
  trapTab({key:'Tab',shiftKey,preventDefault(){prevented=true;}},root);
  assert.equal(prevented,true);assert.equal(document.activeElement,expected);
}
console.log('PASS input shortcuts, native activation, stable dataset/id/position rerender focus and modal tab containment');
