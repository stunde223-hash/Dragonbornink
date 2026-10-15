import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, jwtVerify } from 'jose';
import { authorize } from '../server/auth.js';
import { onRequest } from '../functions/api/admin/videos.js';
import { onRequest as middleware } from '../functions/_middleware.js';
const env = { ACCESS_ISSUER: 'https://example.cloudflareaccess.com', ACCESS_AUD: 'private-dashboard' };
test('private routes fail closed, validate signed claims, and reject cross-origin writes', async () => {
 const { privateKey, publicKey } = await generateKeyPair('RS256');
 const token = await new SignJWT({}).setProtectedHeader({ alg: 'RS256' }).setIssuer(env.ACCESS_ISSUER).setAudience(env.ACCESS_AUD).setSubject('artist').setIssuedAt().setExpirationTime('1h').sign(privateKey);
 const request = (token, origin = 'https://example.com') => new Request('https://example.com/api/admin/videos', { method: 'POST', headers: { 'Cf-Access-Jwt-Assertion': token, Origin: origin } });
 const verify = (token, _, options) => jwtVerify(token, publicKey, options);
 assert.equal((await authorize(request(token), {})).status, 503);
 assert.equal(await authorize(request(token), env, verify), null);
 assert.equal((await authorize(request(token + 'bad'), env, verify)).status, 401);
 assert.equal((await authorize(request(token), { ...env, ACCESS_AUD: 'wrong' }, verify)).status, 401);
 assert.equal((await authorize(request(token, 'https://attacker.com'), env, verify)).status, 403);
 const expired = await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(env.ACCESS_ISSUER).setAudience(env.ACCESS_AUD).setSubject('artist').setIssuedAt().setExpirationTime(1).sign(privateKey);
 assert.equal((await authorize(request(expired), env, verify)).status,401);
 for (const path of ['/admin', '/admin/', '/api/admin/videos']) {
  const response = await middleware({ request: new Request('https://example.com' + path), env, next: () => { throw Error('Must not reach private content'); } });
  assert.equal(response.status, 401); assert.equal(response.headers.get('Cache-Control'), 'no-store');
 }
});
test('video storage upload, list, read, range and deletion; invalid uploads are rejected', async () => {
 const objects = new Map();
 const VIDEOS = {
  put: async (key, body, metadata) => objects.set(key, {key, body, size:body.length, ...metadata, uploaded: new Date()}),
  list: async () => ({ objects: [...objects.values()], truncated: false }),
  get: async (key, options) => { const value=objects.get(key); if (!value) return null; return options.range.has('Range') ? {...value,body:value.body.slice(0,4),range:{offset:0,length:4}} : value; },
  delete: async key => objects.delete(key)
 };
 const call = (query = '', options = {}) => onRequest({request:new Request('https://example.com/api/admin/videos'+query,options),env:{VIDEOS}});
 assert.equal((await onRequest({request:new Request('https://example.com'),env:{}})).status,503);
 assert.equal((await call('',{method:'POST',headers:{'Content-Type':'text/html'},body:'bad'})).status,415);
 assert.equal((await call('',{method:'POST',headers:{'Content-Type':'video/mp4'},body:'not a video'})).status,400);
 assert.equal((await call('',{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(51*1048576)},body:'x'})).status,413);
 const bytes = new Uint8Array([0,0,0,12,102,116,121,112,105,115,111,109]);
 const uploaded = await call('?name=My%20video.mp4',{method:'POST',headers:{'Content-Type':'video/mp4'},body:bytes});
 assert.equal(uploaded.status,201); const {key}=await uploaded.json();
 assert.equal((await (await call()).json()).videos[0].name,'My video.mp4');
 assert.deepEqual(new Uint8Array(await (await call('?key='+key)).arrayBuffer()),bytes);
 const ranged=await call('?key='+key,{headers:{Range:'bytes=0-3'}});assert.equal(ranged.status,206);assert.equal(ranged.headers.get('Content-Range'),'bytes 0-3/12');
 assert.equal((await call('?key=../../secret')).status,400);
 assert.equal((await call('?key='+key,{method:'DELETE'})).status,204);
 assert.equal((await call('?key='+key)).status,404);
});
