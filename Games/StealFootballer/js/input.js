export function blocksGameplayKey(event) {
  if(event.target.closest('input,select,textarea,[contenteditable="true"]'))return true;
  return ['Enter',' '].includes(event.key)&&!!event.target.closest('button,a');
}

export function rememberFocus(root) {
  const active=root.ownerDocument.activeElement;
  if(!root.contains(active))return null;
  const action=active.dataset.action;
  const actionData=action?Object.fromEntries(['action','id','uid','index','base','market','event'].map(key=>[key,active.dataset[key]])):null;
  return {id:active.id,position:active.dataset.position,actionData};
}

export function restoreFocus(root,token,fallback) {
  if(!token)return;
  const candidate=token.id?root.ownerDocument.getElementById(token.id):
    token.position!==undefined?[...root.querySelectorAll('[data-position]')].find(el=>el.dataset.position===token.position):
    token.actionData?[...root.querySelectorAll('[data-action]')].find(el=>Object.entries(token.actionData).every(([key,value])=>el.dataset[key]===value)):null;
  (candidate&&root.contains(candidate)&&!candidate.disabled?candidate:fallback).focus();
}

export function trapTab(event,root) {
  if(event.key!=='Tab')return;
  const focusable=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>!el.hidden);
  const first=focusable[0],last=focusable.at(-1),active=root.ownerDocument.activeElement;
  if(!focusable.includes(active)||event.shiftKey&&active===first||!event.shiftKey&&active===last) {
    event.preventDefault();(event.shiftKey?last:first)?.focus();
  }
}
