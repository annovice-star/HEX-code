"use client";
import {useEffect,useRef,useState} from 'react';
import {assetHref} from '../lib/client-runtime';
import MarkdownContent from './markdown-content';
import type {Article} from '../lib/content';

export default function PreparedArticle({article}:{article:Article}){
 const edition=article.guide!.edition!,frame=useRef<HTMLIFrameElement>(null);
 const [height,setHeight]=useState(1900),[fallback,setFallback]=useState(false);
 useEffect(()=>{
  let received=false;
  function resized(event:MessageEvent){
   if(event.source!==frame.current?.contentWindow||event.data?.type!=='prepared-article-height')return;
   const next=event.data.height;
   if(typeof next!=='number'||!Number.isFinite(next)||next<100||next>30000)return;
   received=true;setFallback(false);setHeight(Math.ceil(next));
  }
  addEventListener('message',resized);
  const timeout=setTimeout(()=>{if(!received)setFallback(true);},10000);
  return()=>{removeEventListener('message',resized);clearTimeout(timeout);};
 },[edition.html]);
 return <div className="prepared-article">
  <iframe ref={frame} src={assetHref(edition.html)} title={article.title} height={height} sandbox="allow-scripts allow-popups" style={{display:fallback?'none':'block'}}/>
  {fallback&&<MarkdownContent body={article.body} id={article.id}/>}
 </div>;
}

