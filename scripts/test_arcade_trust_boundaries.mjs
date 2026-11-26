import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

// The game distributions supply classic scripts. Exercise their normal event
// listener registrations with benign local readiness/level messages, isolated
// from an engine, WebRTC, service worker or actual cross-origin connection.
const origin = 'https://arcade.example';
const names = execFileSync('git', ['ls-files', '-z', 'Games/Ovo'], {encoding:'utf8'})
  .split('\0').filter(path => /level-editor(?: copy)?\.js$/.test(path));
assert.equal(names.length, 14);
for (const path of names) {
  let receive;
  const sandbox = {location:{origin},window:{addEventListener(type, cb) { if (type==='message') receive=cb; }},
    console:{log() {}}};
  const install = vm.runInNewContext(read(path), sandbox);
  if (typeof install === 'function') install();
  assert.equal(typeof receive,'function',path);
  const replies = [];
  const source = {postMessage(reply,target) { replies.push({reply,target}); }};
  const ready = {isLevelEditor:true,messageType:'isReady'};
  for (const event of [{source,origin:'https://another.example',data:ready}, {source,origin:'null',data:ready},
    {source:null,origin,data:ready}, {source,origin,data:null}, {source,origin,data:{...ready,messageType:42}}]) {
    receive(event);
  }
  assert.equal(replies.length,0,path);
  receive({source,origin,data:ready});
  assert.equal(replies.length,1,path);
  assert.equal(replies[0].reply.isReady,false,path);
  assert.equal(replies[0].target,origin,path);
  const started = [];
  sandbox.ovoLevelEditor={startLevel(level){started.push(level);},getPlayer(){return {};}};
  const level={layout:{name:'Practice'},layers:{}};
  const request={isLevelEditor:true,messageType:'startLevel',level};
  receive({source,origin:'https://another.example',data:request});
  receive({source,origin,data:{...request,level:null}});
  assert.equal(started.length,0,path);
  receive({source,origin,data:request});
  assert.deepEqual(started,[level],path);
  assert.equal(replies.at(-1).reply.levelStarted,true,path);
}
console.log('PASS all 14 OvO editor receivers preserve local readiness/preview and ignore unrelated senders or incomplete messages.');

for (const config of [undefined, {}]) {
  let registrations=0, launches=0, submit;
  const element = {classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},
    addEventListener(type,callback){if(type==='submit')submit=callback;}};
  const context = {self:{__uv$config:config}, document:{getElementById(){return element;}},
    console:{error(){},info(){}}, navigator:{serviceWorker:{register(){registrations++;return Promise.resolve();}}},
    window:{location:{assign(){launches++;}}}};
  vm.runInNewContext(read('uv/index.js'), context);
  assert.equal(element.disabled,true);
  if (config) { let prevented=false;submit({preventDefault(){prevented=true;}});assert.equal(prevented,true); }
  assert.equal(registrations,0);
  assert.equal(launches,0);
}
console.log('PASS disabled proxy requests no worker and never routes a submission with or without local codec config.');

for (const game of ['SubwaySurfers','SubwaySurfersHacked']) {
  const entry=read('Games/'+game+'/subwaysurfers/index.html');
  assert.match(entry, /http-equiv="refresh" content="0;url=\.\.\/index\.html"/i);
  assert.doesNotMatch(entry, /<script\b|https?:\/\//i);
}
for (const edition of ['1.4.5','kaizo','reverse']) {
  const helper=read('Games/Ovo/'+edition+'/sdk.html');
  assert.match(helper, /href="\.\/index\.html"/i);
  assert.doesNotMatch(helper, /<script\b|https?:\/\//i);
}
assert.doesNotMatch(read('Games/_emulatorjs/data/localization/Translate.html'), /<script[^>]+src=["'](?:https?:)?\/\//i);
console.log('PASS five legacy wrapper pages use local games and the EmulatorJS translation tool has no external script.');
