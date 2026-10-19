import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.TEST_ORIGIN??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local test only');
const origin='https://annovice-star.github.io';
const credentials=JSON.parse(await readFile(new URL('../outputs/auth-test.json',import.meta.url),'utf8'));
// Local-only: satisfy Vinext's development host check so application CORS is exercised.
const send=(value,from=origin)=>fetch(base+'/api/gateway',{method:'POST',headers:{Origin:from,'X-Forwarded-Host':new URL(from).hostname,'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(value),signal:AbortSignal.timeout(20000)});
assert.equal((await send({path:'/api/auth/login',method:'POST',body:JSON.stringify(credentials)},'https://evil.example')).status,403);
for(const path of ['/api/content','/api/admin','/api/search?q=test','/api/inquiries'])assert.equal((await send({path,method:'GET'})).status,401);
assert.equal((await send({path:'/api/gateway',method:'POST'})).status,400);
let r=await send({path:'/api/auth/login',method:'POST',body:JSON.stringify({...credentials,password:'intentionally-wrong'})});assert.equal(r.status,401);
r=await send({path:'/api/auth/login',method:'POST',body:JSON.stringify(credentials)});assert.equal(r.status,200,await r.clone().text());
assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(r.headers.get('set-cookie'),null);
const {token}=await r.json();assert.match(token,/^[0-9a-f]{64}$/);
try{
 for(const path of ['/api/content','/api/admin','/api/search?q=test','/api/inquiries']){r=await send({path,method:'GET',token});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);}
 assert.equal((await send({path:'/api/admin',method:'POST',token,body:'{"action":"invalid"}'})).status,400);
 assert.equal((await send({path:'/api/chat',method:'POST',token,body:'{}'})).status,503);
 assert.equal((await send({path:'/api/admin',method:'POST',token,body:'{}'},'https://evil.example')).status,403);
}finally{assert.equal((await send({path:'/api/auth/logout',method:'POST',token,body:'{}'})).status,200);}
assert.equal((await send({path:'/api/content',method:'GET',token})).status,401);
console.log('PASS: gateway origin enforcement, protected content/admin/search/inquiries, token login, errors, AI disabled and logout revocation');
