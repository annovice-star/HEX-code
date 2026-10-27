import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const url='https://example.com/article-editions/sample/index.html';
function environment(){
 globalThis.location={href:'https://example.com/'};
 const storage={};
 Object.defineProperties(storage,{
  getItem:{value:key=>storage[key]??null},
  setItem:{value:(key,value)=>{storage[key]=value;}},
  removeItem:{value:key=>{delete storage[key];}},
 });
 globalThis.localStorage=storage;return storage;
}
test('concurrent reading and export share one request and repeated reads use memory',async()=>{
 environment();let calls=0,release;
 globalThis.fetch=async(_,options)=>{calls++;assert.equal(options.cache,'no-cache');await new Promise(resolve=>release=resolve);return new Response('<main>current</main>');};
 const cache=await import('../lib/article-cache.ts?dedup');
 const reading=cache.loadArticleHtml('/article-editions/sample/index.html');
 const exporting=cache.loadArticleHtml('/article-editions/sample/index.html');
 release();assert.equal(await reading,'<main>current</main>');assert.equal(await exporting,await reading);
 assert.equal(await cache.loadArticleHtml('/article-editions/sample/index.html'),await reading);assert.equal(calls,1);
});
test('a stale saved article displays immediately and publishes the refreshed content',async()=>{
 const storage=environment();storage.setItem('apec-article-v1:'+url,JSON.stringify({html:'<main>saved</main>',checkedAt:Date.now()-6*60*1000}));
 let release;globalThis.fetch=async()=>{await new Promise(resolve=>release=resolve);return new Response('<main>updated</main>');};
 const cache=await import('../lib/article-cache.ts?stale');
 let updated;const changed=new Promise(resolve=>updated=resolve);const stop=cache.watchArticleHtml('/article-editions/sample/index.html',updated);
 assert.equal(await cache.loadArticleHtml('/article-editions/sample/index.html'),'<main>saved</main>');
 release();assert.equal(await changed,'<main>updated</main>');stop();
 assert.equal(JSON.parse(storage.getItem('apec-article-v1:'+url)).html,'<main>updated</main>');
});
test('a failed load can be retried and disabled storage does not block reading',async()=>{
 environment();globalThis.localStorage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};
 let calls=0;globalThis.fetch=async()=>{if(++calls===1)throw Error('offline');return new Response('<main>retry</main>');};
 const cache=await import('../lib/article-cache.ts?retry');
 await assert.rejects(cache.loadArticleHtml('/article-editions/sample/index.html'));
 assert.equal(await cache.loadArticleHtml('/article-editions/sample/index.html'),'<main>retry</main>');assert.equal(calls,2);
});
test('separated article photographs retain their approved bytes and relative files exist',()=>{
 const base=new URL('../public/article-editions/shenzhen-auto-export-20261027/',import.meta.url);
 const html=readFileSync(new URL('index.html',base),'utf8');
 const images=[...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(images.length,2);assert.ok(Buffer.byteLength(html)<10000);
 assert.deepEqual(images.map(name=>createHash('sha256').update(readFileSync(new URL(name,base))).digest('hex')),['9472db4ec090f4c88e9fadda3614872ab4f9fd3ca910d36aa51dfde12e8bae29','0a594a2cd1c884599c954ee6a7f67fb4b74c177c2e7695fb6e11ba5ad71b0488']);
});

