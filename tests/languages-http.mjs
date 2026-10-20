import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN??'http://127.0.0.1:8787';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local test only');
const credentials=JSON.parse(await readFile(new URL('../outputs/auth-test.json',import.meta.url),'utf8'));
async function request(path,body,cookie){return fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});}
const login=await request('/api/auth/login',credentials);assert.equal(login.status,200);
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),ids=[];
try{
 for(const language of ['ja','ko','es','pt']){
  const id=`language-test-${Date.now()}-${language}`;ids.push(id);
  const article={id,title:'LOCAL LANGUAGE TEST',summary:'Local validation only',body:'Local validation only',category:'apec',kind:'news',language,source:'Test',sourceUrl:'',date:'2026-10-20',status:'draft',featured:false,demo:false};
  const saved=await request('/api/admin',{action:'save',article},cookie);assert.equal(saved.status,200,await saved.clone().text());assert.equal((await saved.json()).article.language,language);
  const search=await request('/api/search?q=APEC&lang='+language,undefined,cookie);assert.equal(search.status,200);assert.ok(Array.isArray((await search.json()).sources));
 }
 const admin=await request('/api/admin',undefined,cookie);assert.equal(admin.status,200);const data=await admin.json();
 for(const id of ids)assert.ok(data.articles.find(a=>a.id===id));
 assert.equal((await request('/api/chat',{message:'test',language:'ja'},cookie)).status,503);
}finally{
 for(const id of ids)assert.equal((await request('/api/admin',{action:'delete',id},cookie)).status,200);
 await request('/api/auth/logout',{},cookie);
}
console.log('PASS: four new article languages persist through the admin API, search accepts the new languages, public AI remains disabled.');
