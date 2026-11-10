import assert from 'node:assert/strict';
import {blocksGameplayKey,rememberFocus,restoreFocus,trapTab} from '../js/input.js';

const target=kind=>({closest:selector=>selector.split(',').includes(kind)?{}:null});
for(const key of ['w','ArrowUp','e','f'])assert.equal(blocksGameplayKey({key,target:target('button')}),false);
for(const kind of ['button','a'])for(const key of ['Enter',' '])assert.equal(blocksGameplayKey({key,target:target(kind)}),true);
for(const kind of ['input','select','textarea','[contenteditable="true"]'])assert.equal(blocksGameplayKey({key:'w',target:target(kind)}),true);

const document={activeElement:null,getElementById:id=>elements.find(el=>el.id===id)};
let elements=[];
const element=(id='',position)=>({id,dataset:{position},disabled:false,hidden:false,focus(){document.activeElement=this;}});
const root={ownerDocument:document,contains:el=>elements.includes(el),querySelector:selector=>elements.find(el=>selector===`[data-position="${el.dataset.position}"]`),querySelectorAll:()=>elements};
const fallback=element('close');
for(const [id,position] of [['formation',undefined],['', '3']]) {
  const original=element(id,position);elements=[original];original.focus();
  const token=rememberFocus(root),replacement=element(id,position);elements=[replacement];
  restoreFocus(root,token,fallback);assert.equal(document.activeElement,replacement);
}
elements=[element('removed')];elements[0].focus();const token=rememberFocus(root);
elements=[];restoreFocus(root,token,fallback);assert.equal(document.activeElement,fallback);

elements=[element('first'),element('last')];
for(const [active,shiftKey,expected] of [[elements[1],false,elements[0]],[elements[0],true,elements[1]],[fallback,false,elements[0]],[fallback,true,elements[1]]]) {
  document.activeElement=active;let prevented=false;
  trapTab({key:'Tab',shiftKey,preventDefault(){prevented=true;}},root);
  assert.equal(prevented,true);assert.equal(document.activeElement,expected);
}
console.log('PASS input shortcuts, native activation, rerender focus and modal tab containment');
