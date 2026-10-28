import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waitForExportStep,waitForExportImage,exportDimensions,ExportTimeoutError} from '../lib/export-safety.ts';

test('a never-settling rendering step times out instead of keeping the button busy',async()=>{
 await assert.rejects(waitForExportStep(new Promise(()=>{}),'render',15),error=>error instanceof ExportTimeoutError&&error.stage==='render');
 assert.equal(await waitForExportStep(Promise.resolve('retry'),'render',100),'retry');
});
test('cancelling rejects promptly, including an already-aborted operation',async()=>{
 const controller=new AbortController();const pending=waitForExportStep(new Promise(()=>{}),'render',500,controller.signal);controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
 await assert.rejects(waitForExportStep(Promise.reject(Error('already failed')),'image',500,controller.signal),{name:'AbortError'});
});
test('loaded photos do not depend on the browser image.decode promise',async()=>{
 const image=Object.assign(new EventTarget(),{complete:true,naturalWidth:1500,decode(){throw Error('decode must not be called');}});
 await waitForExportImage(image);
 image.naturalWidth=0;await assert.rejects(waitForExportImage(image),/unavailable/);
});
test('missing image events have a deadline and failed images are not silently omitted',async()=>{
 const image=Object.assign(new EventTarget(),{complete:false,naturalWidth:0});
 await assert.rejects(waitForExportImage(image,undefined,15),ExportTimeoutError);
 const next=waitForExportImage(image,undefined,100);image.dispatchEvent(new Event('error'));await assert.rejects(next,/unavailable/);
});
test('mobile output stays within a conservative bitmap budget with the full layout height',()=>{
 for(const height of [1700,1754,3000]){const dim=exportDimensions(height,true);assert.ok(dim.width<=720);assert.ok(dim.width*dim.height<=2_500_000);assert.equal(dim.height,Math.ceil(height*dim.width/430));}
 assert.equal(exportDimensions(1754,false).width,1080);
 assert.throws(()=>exportDimensions(15000,true),/too long/);
});
const vendor=readFileSync(new URL('../vendor/html2canvas/html2canvas.esm.js',import.meta.url),'utf8');
const start=vendor.indexOf('var iframeLoader = function (iframe)'),end=vendor.indexOf('var ignoredStyleProperties',start);
const loader=new Function('setTimeout','setInterval','clearTimeout','clearInterval',vendor.slice(start,end)+';return iframeLoader;')((fn,ms)=>setTimeout(fn,Math.min(ms,60)),(fn)=>setInterval(fn,2),clearTimeout,clearInterval);
test('the cloned document becomes ready even when its browser never fires a load event',async()=>{
 const frame={parentNode:{},contentWindow:{document:{body:{childNodes:[{}]},readyState:'complete'}}};
 assert.equal(await loader(frame),frame);assert.equal(frame.onload,null);
});
test('a clone that never becomes ready rejects and releases polling handlers',async()=>{
 const frame={parentNode:{},contentWindow:{document:{body:{childNodes:[]},readyState:'loading'}}};
 await assert.rejects(loader(frame),/timed out/);assert.equal(frame.onload,null);assert.equal(frame.contentWindow.onload,null);
});

