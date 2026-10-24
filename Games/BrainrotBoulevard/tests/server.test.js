import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// HTTP availability and MIME validation only; this does not execute a browser.
test('local server serves every runtime dependency and the real GLB with valid MIME types',async()=>{
  const port=18641;
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
  try{
    await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error(`Server did not start: ${stderr}`)),4000))]);
    for(const [path,type] of [['/','text/html'],['/style.css','text/css'],['/src/main.js','text/javascript'],['/src/characters.js','text/javascript'],['/src/character-surfaces.js','text/javascript'],['/src/secret-character.js','text/javascript'],['/src/rules.js','text/javascript'],['/vendor/three.module.js','text/javascript'],['/vendor/loaders/GLTFLoader.js','text/javascript'],['/vendor/utils/BufferGeometryUtils.js','text/javascript'],['/vendor/environments/RoomEnvironment.js','text/javascript'],['/assets/secret-cave-creature.glb','model/gltf-binary']]){
      const response=await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status,200,path);assert.equal(response.headers.get('content-type'),type,path);
      const bytes=new Uint8Array(await response.arrayBuffer());assert.ok(bytes.length>0,path);
      if(path.endsWith('.glb'))assert.equal(bytes.length,6384292);
    }
    assert.equal((await fetch(`http://127.0.0.1:${port}/not-a-file`)).status,404);
  }finally{child.kill('SIGTERM');await once(child,'exit');}
});
