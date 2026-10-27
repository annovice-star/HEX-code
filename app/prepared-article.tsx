"use client";
import {useEffect,useRef,useState} from 'react';
import {assetHref} from '../lib/client-runtime';
import type {Article} from '../lib/content';

export default function PreparedArticle({article}:{article:Article}){
 const html=article.guide!.edition!.html,host=useRef<HTMLDivElement>(null);
 const [loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController(),element=host.current!;
  const root=element.shadowRoot??element.attachShadow({mode:'open'});
  root.replaceChildren();setLoading(true);setFailed(false);
  (async()=>{
   const response=await fetch(assetHref(html),{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Article unavailable');
   const source=new DOMParser().parseFromString(await response.text(),'text/html');
   const main=source.querySelector('main');if(!main)throw Error('Article body unavailable');
   main.querySelectorAll('script,iframe,object,embed,base').forEach(node=>node.remove());
   for(const node of main.querySelectorAll('*'))for(const attribute of [...node.attributes]){
    if(attribute.name.toLowerCase().startsWith('on')||(['href','src','xlink:href'].includes(attribute.name)&&/^\s*javascript:/i.test(attribute.value)))node.removeAttribute(attribute.name);
   }
   // Keep the approved markup and photos directly in the page DOM, while
   // isolating its styles from the site's heading and paragraph rules.
   const style=document.createElement('style');
   style.textContent=`:host{display:block;container-type:inline-size;container-name:article-edition;user-select:text;-webkit-user-select:text}.edition-document{font-size:16px;line-height:normal;user-select:text;-webkit-user-select:text}`+
    [...source.querySelectorAll('style')].map(node=>node.textContent??'').join('\n')
     .replace(/:root\b/g,':host')
     .replace(/\bbody\b/g,'.edition-document')
     .replace(/@media\s*\(\s*max-width\s*:\s*(\d+px)\s*\)/g,'@container article-edition (max-width:$1)');
   const wrapper=document.createElement('div');wrapper.className='edition-document';wrapper.lang=article.language;
   wrapper.appendChild(document.importNode(main,true));
   if(controller.signal.aborted)return;
   root.replaceChildren(style,wrapper);setLoading(false);
  })().catch(()=>{if(!controller.signal.aborted){setFailed(true);setLoading(false);}});
  return()=>controller.abort();
 },[html,article.language,attempt]);
 return <div className="prepared-article">
  <div ref={host} className="prepared-html" aria-label={article.title}/>
  {loading&&<p role="status">正在加载文章…</p>}
  {failed&&<p role="alert">文章暂时未能加载。<button className="text-link" onClick={()=>setAttempt(value=>value+1)}>重新加载</button></p>}
 </div>;
}

