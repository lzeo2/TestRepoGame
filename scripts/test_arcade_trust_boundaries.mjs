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

// Both distributions may run on localhost. Exercise the precise update branch
// with a local callback so tests cover debug and production without networking.
for (const name of ['emulator.js','emulator.min.js']) {
  const source = read('Games/_emulatorjs/data/' + name);
  const branch = name === 'emulator.js'
    ? source.match(/if \(window\.EJS_CHECK_FOR_UPDATES[^\n]+this\.checkForUpdates\(\);/)?.[0]
    : source.match(/!0===window\.EJS_CHECK_FOR_UPDATES&&this\.checkForUpdates\(\)/)?.[0];
  assert.ok(branch, name);
  assert.equal(source.match(/this\.checkForUpdates\(\)/g)?.length, 1);
  for (const flag of [undefined,false,true]) {
    let checks = 0;
    const sandbox = {window:{EJS_CHECK_FOR_UPDATES:flag}, checkForUpdates(){checks++;}};
    vm.runInNewContext(branch, sandbox);
    assert.equal(checks, flag === true ? 1 : 0, name);
  }
}
console.log('PASS EmulatorJS source and release only check upstream when explicitly requested.');

const ovo = 'Games/Ovo/1.4.5/';
const entry = read(ovo + 'index.html');
assert.doesNotMatch(entry, /<script\b[^>]*src=["'](?:\.\/)?GameAnalytics\.js/i);
const fallback = entry.match(/<script>(window\.GameAnalytics\s*=.*?window\.gameanalytics\s*=.*?;)<\/script>/)?.[1];
assert.ok(fallback);
const globals = {window:{}};
vm.runInNewContext(fallback,globals);
assert.equal(typeof globals.window.GameAnalytics.initialize,'undefined');
assert.equal(typeof globals.window.gameanalytics.GameAnalytics,'undefined');
const languageData = JSON.parse(read(ovo + 'languages.json'));
assert.equal(languageData.version,'1.4.5');
assert.ok(Object.keys(languageData.languages).length > 1);
const engineEvents = read(ovo + 'data.js');
assert.ok(/"setLanguageJSON".{0,150}"getTranslations"/.test(engineEvents));
const translation = read(ovo + 'unlockalllevels.js');
assert.doesNotMatch(translation,/docs\.google\.com/);
const lookup = translation.match(/async function getTranslations\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(lookup);
const cached = vm.runInNewContext(lookup + '\ngetTranslations()', {languageJSON:languageData});
assert.equal(await cached,languageData);
console.log('PASS the registered OvO edition retains its bundled languages and uses the engine’s no-analytics path.');

const burrito = 'Games/BurritoBison/';
const shim = vm.runInNewContext(read(burrito+'js/unity-mod.js') + '\nopenUnityRequest', {
  URL, document:{baseURI:'https://offline.example/arcade/Games/BurritoBison/'}
});
const opens = [];
const request = {open(...args){opens.push(args);}};
shim(request,'POST','https://api.cloudmoolah.com/data');
shim(request,'POST','//sample.api.swrve.com/1/batch');
shim(request,'GET','Build/Web.json');
shim(request,'POST','save?name=cloudmoolah.com');
assert.deepEqual(opens,[['GET','json/null.json',true],['GET','json/null.json',true],
  ['GET','Build/Web.json',true],['POST','save?name=cloudmoolah.com',true]]);
assert.match(read(burrito+'Build/Web.asm.framework.unityweb.js'),/openUnityRequest\(http,_method,_url\)/);
assert.doesNotThrow(()=>JSON.parse(read(burrito+'json/null.json')));
console.log('PASS Burrito Bison reads its static offline reply with GET and preserves local request methods.');

for (const game of ['SubwaySurfers','SubwaySurfersHacked']) {
  const messages = [];
  const window = {unityGame:{SendMessage(...message) {messages.push(message);}}};
  vm.runInNewContext(read('Games/'+game+'/js/poki-noop.js'),{window});
  window.initPokiBridge('Runner');
  await Promise.resolve();
  await window.commercialBreak();
  await window.rewardedBreak();
  assert.deepEqual(messages,[['Runner','ready'],['Runner','commercialBreakCompleted'],
    ['Runner','rewardedBreakCompleted','false']]);
}
console.log('PASS both Subway Surfers bridges release gameplay after a commercial break and grant no offline ad reward.');
const hackedRunner = read('Games/SubwaySurfersHacked/index.html');
assert.match(hackedRunner, /<title>Subway Surfers Hacked<\/title>/);
assert.match(hackedRunner, /<h1>Subway Surfers Hacked<\/h1>/);
assert.doesNotMatch(hackedRunner, /id="hackBadge"/);

const calls = [];
class LocalRequest {open(...parameters) {calls.push(parameters);}}
vm.runInNewContext(read('Games/Superhot/main.js'),{XMLHttpRequest:LocalRequest});
const localRequest = new LocalRequest();
for (const endpoint of ['HWStats.cgi','HWStatsUpdate.cgi']) {
  localRequest.open('POST','https://stats.unity3d.com/'+endpoint,true);
}
localRequest.open('GET','webgl.datagz',false,'user','password');
localRequest.open('POST','http://127.0.0.1/save',true);
assert.deepEqual(calls,[
  ['GET','data:application/octet-stream;base64,',true],
  ['GET','data:application/octet-stream;base64,',true],
  ['GET','webgl.datagz',false,'user','password'],
  ['POST','http://127.0.0.1/save',true]
]);
const superhotEntry = read('Games/Superhot/index.html');
assert.ok(superhotEntry.indexOf('"main.js"') < superhotEntry.indexOf('"UnityLoader.js"'));
console.log('PASS Super Hot suppresses only its two optional Unity hardware survey posts.');
