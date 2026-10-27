import {assetHref} from './client-runtime.ts';

type Entry={html:string;checkedAt:number};
const freshFor=5*60*1000,maxAge=24*60*60*1000,prefix='apec-article-v1:';
const memory=new Map<string,Entry>(),pending=new Map<string,Promise<string>>();
const listeners=new Map<string,Set<(html:string)=>void>>();
export function articleDocumentUrl(path:string){return new URL(assetHref(path),location.href).href;}
function remember(url:string,entry:Entry){
 memory.delete(url);memory.set(url,entry);
 if(memory.size>20)memory.delete(memory.keys().next().value!);
 try{
  localStorage.setItem(prefix+url,JSON.stringify(entry));
  const keys=Object.keys(localStorage).filter(key=>key.startsWith(prefix));
  if(keys.length>20){const oldest=keys.sort((a,b)=>JSON.parse(localStorage.getItem(a)!).checkedAt-JSON.parse(localStorage.getItem(b)!).checkedAt);oldest.slice(0,keys.length-20).forEach(key=>localStorage.removeItem(key));}
 }catch{/* Storage is optional in embedded browsers. */}
}
function cached(url:string):Entry|undefined{
 const current=memory.get(url);if(current)return current;
 try{const value=JSON.parse(localStorage.getItem(prefix+url)??'null');if(value&&typeof value.html==='string'&&typeof value.checkedAt==='number'&&Date.now()-value.checkedAt<maxAge){memory.set(url,value);return value;}}catch{/* Use the network when storage is unavailable. */}
}
function refresh(url:string){
 const existing=pending.get(url);if(existing)return existing;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 const request=(async()=>{
  // Revalidate the HTTP cache so edits reach returning readers too.
  const response=await fetch(url,{cache:'no-cache',signal:controller.signal});
  if(!response.ok)throw Error('Article unavailable');
  const html=await response.text();if(!/<main\b/i.test(html)||html.length>2_000_000)throw Error('Article body unavailable');
  const previous=memory.get(url)?.html;remember(url,{html,checkedAt:Date.now()});
  if(previous!==html)listeners.get(url)?.forEach(listener=>listener(html));
  return html;
 })().finally(()=>{clearTimeout(timeout);pending.delete(url);});
 pending.set(url,request);return request;
}
export function loadArticleHtml(path:string,force=false):Promise<string>{
 const url=articleDocumentUrl(path),entry=cached(url);
 if(force)return refresh(url);
 if(entry){if(Date.now()-entry.checkedAt>=freshFor)void refresh(url).catch(()=>{});return Promise.resolve(entry.html);}
 return refresh(url);
}
export function watchArticleHtml(path:string,listener:(html:string)=>void){
 const url=articleDocumentUrl(path),set=listeners.get(url)??new Set();set.add(listener);listeners.set(url,set);
 return()=>{set.delete(listener);if(!set.size)listeners.delete(url);};
}
export async function prefetchArticleHtml(path:string){
 try{
  const html=await loadArticleHtml(path),doc=new DOMParser().parseFromString(html,'text/html');
  // Ordinary image URLs share the browser's image cache with reading and export.
  for(const img of doc.querySelectorAll('main img[src]')){const image=new Image();image.src=new URL(img.getAttribute('src')!,articleDocumentUrl(path)).href;}
 }catch{/* A failed prefetch must never interrupt navigation. */}
}

