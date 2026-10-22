"use client";
import {useEffect,useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {safeMarkdownUrl,markdownHeadingIds,uploadedImagePattern} from '../lib/markdown';
import {apiFetch,assetHref} from '../lib/client-runtime';

export function MarkdownImage({src='',alt='',title,preview=false}:{src?:string;alt?:string;title?:string;preview?:boolean}){
 const [privateSource,setPrivateSource]=useState(''),[failed,setFailed]=useState(false);
 const protectedPreview=preview&&uploadedImagePattern.test(src);
 useEffect(()=>{setFailed(false);setPrivateSource('');if(!protectedPreview)return;let active=true;
  apiFetch('/api/admin/markdown-image?path='+encodeURIComponent(src)).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<{data:string}>;}).then(value=>{if(active)setPrivateSource(value.data);}).catch(()=>{if(active)setFailed(true);});
  return()=>{active=false;};
 },[src,protectedPreview]);
 if(!src||!safeMarkdownUrl(src,true)||failed)return <span className="markdown-image-error">图片暂不可用{alt?`：${alt}`:''}</span>;
 if(protectedPreview&&!privateSource)return <span className="markdown-image-error">正在加载图片…</span>;
 return <span className="markdown-image"><img src={protectedPreview?privateSource:uploadedImagePattern.test(src)?assetHref(src):src} alt={alt} title={title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>{title&&<span className="markdown-caption">{title}</span>}</span>;
}
export default function MarkdownContent({body,id='preview',preview=false}:{body:string;id?:string;preview?:boolean}){
 const prefix=`md-${id}`;
 return <div className="markdown-content"><ReactMarkdown skipHtml remarkPlugins={[remarkGfm,[markdownHeadingIds,{prefix}]]} urlTransform={(url,key)=>safeMarkdownUrl(url,key==='src')?url:''} components={{
  h1:({node,...props})=><h2 {...props}/>,
  a:({node,href,children,...props})=><a {...props} href={href} target={href?.startsWith('#')?undefined:'_blank'} rel="noopener noreferrer" onClick={event=>{if(href?.startsWith('#')){event.preventDefault();let target=href.slice(1);try{target=decodeURIComponent(target);}catch{}document.getElementById(`${prefix}-${target}`)?.scrollIntoView({behavior:'smooth'});}}}>{children}</a>,
  img:({node,src,alt,title})=><MarkdownImage src={typeof src==='string'?src:''} alt={alt} title={title} preview={preview}/>,
  table:({node,...props})=><div className="markdown-table"><table {...props}/></div>,
 }}>{body}</ReactMarkdown></div>;
}
