import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.TEST_ORIGIN??'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local test only');
const credentials=JSON.parse(await readFile(new URL('../outputs/auth-test.json',import.meta.url),'utf8'));
const request=(path,extra={})=>fetch(base+path,{redirect:'manual',...extra,signal:AbortSignal.timeout(20000),headers:{Origin:base,...extra.headers}});
const post=(path,data,cookie='')=>request(path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});
const gateway=(path,method='GET',body)=>request('/api/gateway',{method:'POST',headers:{Origin:'https://annovice-star.github.io','X-Forwarded-Host':'annovice-star.github.io','Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({path,method,body:body===undefined?undefined:JSON.stringify(body)})});
assert.equal((await request('/')).status,200);
for(const path of ['/admin','/admin/security'])assert.match((await request(path)).headers.get('location'),/^\/login/);
for(const path of ['/api/admin','/api/inquiries']){assert.equal((await request(path)).status,401);assert.equal((await gateway(path)).status,401);}
assert.equal((await post('/api/admin',{action:'invalid'})).status,401);
assert.equal((await post('/api/auth/password',{})).status,401);
for(const path of ['/api/content','/api/search?q=test']){assert.equal((await request(path)).status,200);assert.equal((await gateway(path)).status,200);}
assert.equal((await post('/api/chat',{message:'test'})).status,503);
const login=await post('/api/auth/login',credentials);assert.equal(login.status,200);const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const id='public-access-'+Date.now();
const article={id,title:'Local public visibility test',summary:'Local validation only',body:'Draft must stay private',category:'business',kind:'insight',language:'en',source:'Test',sourceUrl:'',date:'2026-10-20',status:'draft',featured:false,demo:false};
try{
 assert.equal((await post('/api/admin',{action:'save',article},cookie)).status,200);
 let data=await(await gateway('/api/content')).json();assert.equal(data.aiEnabled,false);assert.ok(!data.articles.some(a=>a.id===id));assert.ok(!('username' in data));
 assert.equal((await request('/article/'+id)).status,404);
 assert.equal((await gateway('/api/inquiries','POST',{articleId:id,name:'Test',email:'test@example.com',message:'Test',language:'en',consent:true})).status,400);
 assert.equal((await post('/api/admin',{action:'save',article:{...article,status:'published'}},cookie)).status,200);
 data=await(await gateway('/api/content')).json();assert.ok(data.articles.some(a=>a.id===id));assert.equal((await request('/article/'+id)).status,200);
}finally{assert.equal((await post('/api/admin',{action:'delete',id},cookie)).status,200);await post('/api/auth/logout',{},cookie);}
console.log('PASS: anonymous frontend/content/search, admin and inquiry-record protection, draft isolation, unchanged AI-off state and authenticated editing');
