import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

test('packaged localhost server compresses text, caches assets and supports video seeking',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'dragonbornink-server-'));
 let server;
 try {
  await cp('dist',folder,{recursive:true});await cp('local-launcher/serve.cjs',join(folder,'serve.cjs'));
  server=spawn(process.execPath,[join(folder,'serve.cjs')],{env:{...process.env,NO_OPEN_BROWSER:'1'},stdio:'pipe'});
  const base=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('Local server startup timed out')),10000);
   server.stdout.on('data',data=>{const match=data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
   server.on('error',reject);
  });
  const home=await fetch(base,{headers:{'Accept-Encoding':'gzip'}});
  assert.equal(home.status,200);assert.equal(home.headers.get('content-encoding'),'gzip');assert.match(await home.text(),/Dragonbornink/);
  const font=await fetch(base+'/fonts/BarlowCondensed-Bold.woff2');
  assert.equal(font.headers.get('content-type'),'font/woff2');assert.match(font.headers.get('cache-control'),/max-age/);await font.arrayBuffer();
  const cached=await fetch(base+'/fonts/BarlowCondensed-Bold.woff2',{headers:{'If-None-Match':font.headers.get('etag')}});
  assert.equal(cached.status,304);
  const video=await fetch(base+'/media/in-session-mobile.mp4',{headers:{Range:'bytes=0-1023'}});
  assert.equal(video.status,206);assert.match(video.headers.get('content-range'),/^bytes 0-1023\//);assert.equal((await video.arrayBuffer()).byteLength,1024);
  assert.equal((await fetch(base+'/media/in-session-mobile.mp4',{headers:{Range:'bytes=99999999-'}})).status,416);
  assert.equal((await fetch(base+'/privacy/')).status,200);
  assert.match(await readFile(join(folder,'LOCAL-ADDRESS.txt'),'utf8'),new RegExp(base));
 } finally {server?.kill();await rm(folder,{recursive:true,force:true});}
});
