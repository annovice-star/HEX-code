import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN??'http://127.0.0.1:8787';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local test only');
const expected=JSON.parse(await readFile(new URL('../lib/launch-articles.json',import.meta.url),'utf8'));
const credentials=JSON.parse(await readFile(new URL('../outputs/auth-test.json',import.meta.url),'utf8'));
async function request(path,body,cookie){return fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});}
const login=await request('/api/auth/login',credentials);assert.equal(login.status,200,await login.clone().text());
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function admin(){const r=await request('/api/admin',undefined,cookie);assert.equal(r.status,200);return r.json();}
const first=await admin();
for(const a of expected){const imported=first.articles.find(x=>x.id===a.id);assert.ok(imported,a.id);assert.deepEqual(imported.guide,a.guide);assert.equal(imported.body,a.body);}
const original=first.articles.find(a=>a.id===expected[0].id);
try{
 const edited={...original,body:original.body+'\n\nLocal persistence validation.'};
 const saved=await request('/api/admin',{action:'save',article:edited},cookie);assert.equal(saved.status,200,await saved.clone().text());
 const again=await admin();assert.equal(again.articles.find(a=>a.id===original.id).body,edited.body);assert.deepEqual(again.articles.find(a=>a.id===original.id).guide.editorial,original.guide.editorial);
 const published=await request('/api/content',undefined,cookie);assert.equal(published.status,200);const content=await published.json();
 for(const a of expected){const row=content.articles.find(x=>x.id===a.id);assert.ok(row);assert.equal(row.guide.editorial.sources.length,a.guide.editorial.sources.length);}
 for(const a of expected)for(const f of a.guide.editorial.figures){const image=await request(f.file,undefined,cookie);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/);}
 const html=await request('/article/'+original.id,undefined,cookie);assert.equal(html.status,200);const markup=await html.text();assert.ok(markup.includes('AI生成'));assert.ok(markup.includes('参考来源'));assert.ok(markup.includes('/article-images/'));
}finally{
 assert.equal((await request('/api/admin',{action:'save',article:original},cookie)).status,200);
 await request('/api/auth/logout',{},cookie);
}
console.log('PASS: five records imported, repeat reads preserve edits, admin saves preserve image/source metadata, all image assets and rendered article available.');
