import html2canvas from '../vendor/html2canvas/html2canvas.esm.js';
import {compactExportDevice,exportDimensions,waitForExportImage,waitForExportStep} from './export-safety';

export const ARTICLE_EXPORT_LAYOUT_WIDTH=430;
export const ARTICLE_EXPORT_IMAGE_WIDTH=1080;
export type ArticleExportStage='images'|'layout'|'render'|'encode';
type ExportOptions={signal?:AbortSignal;onProgress?:(stage:ArticleExportStage)=>void};

// The layout stays fixed. Mobile bitmaps are smaller to fit WebView memory limits.
export async function exportArticleHtml(html:string,documentUrl=location.href,options:ExportOptions={}):Promise<Blob>{
 const controller=new AbortController(),signal=controller.signal;
 const cancel=()=>controller.abort();
 if(options.signal?.aborted)controller.abort();else options.signal?.addEventListener('abort',cancel,{once:true});
 const total=setTimeout(cancel,35000);
 const source=new DOMParser().parseFromString(html,'text/html');
 const frame=document.createElement('iframe');let canvas:HTMLCanvasElement|undefined,readyPoll:ReturnType<typeof setInterval>|undefined;
 try{
  source.querySelectorAll('script,iframe,object,embed,base,dialog,meta[http-equiv],.actions').forEach(node=>node.remove());
  for(const node of source.querySelectorAll('*'))for(const attribute of [...node.attributes])if(attribute.name.toLowerCase().startsWith('on'))node.removeAttribute(attribute.name);
  if(!source.querySelector('main'))throw Error('Article body unavailable');
  options.onProgress?.('images');
  const images=new Map<string,Promise<string>>();
  await Promise.all([...source.querySelectorAll('img[src]')].map(async image=>{
   const url=new URL(image.getAttribute('src')!,documentUrl).href;
   image.setAttribute('loading','eager');image.removeAttribute('srcset');image.removeAttribute('sizes');
   if(url.startsWith('data:image/')){image.setAttribute('src',url);return;}
   if(!/^(https?:|blob:)/.test(url))throw Error('Unsupported article image');
   let pending=images.get(url);
   if(!pending){
    pending=(async()=>{
     const response=await waitForExportStep(fetch(url,{cache:'force-cache',credentials:'same-origin',signal}),'image-download',10000,signal);
     if(!response.ok)throw Error('Article image unavailable');
     const blob=await waitForExportStep(response.blob(),'image-download',10000,signal);
     if(!blob.type.startsWith('image/'))throw Error('Invalid article image');
     const reader=new FileReader();
     const result=new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(Error('Article image unavailable'));});
     try{reader.readAsDataURL(blob);return await waitForExportStep(result,'image-read',5000,signal);}finally{if(reader.readyState===1)reader.abort();}
    })();images.set(url,pending);
   }
   image.setAttribute('src',await pending);
  }));
  source.querySelectorAll('picture source').forEach(node=>node.remove());
  const style=source.createElement('style');
  style.textContent=`html,body{margin:0!important;padding:0!important;width:${ARTICLE_EXPORT_LAYOUT_WIDTH}px!important;background:#f7f8f4!important}main{margin:0!important;box-shadow:none!important}.actions{display:none!important}.source a{text-decoration:none!important}*{animation:none!important;transition:none!important}`;
  source.head.appendChild(style);
  frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.dataset.articleExport='true';
  // Remain inside the viewport, behind the page, to avoid offscreen frame throttling.
  frame.style.cssText=`position:fixed;left:0;top:0;width:${ARTICLE_EXPORT_LAYOUT_WIDTH}px;height:1000px;border:0;pointer-events:none;opacity:0.01;z-index:-2147483647;`;
  options.onProgress?.('layout');
  const loaded=new Promise<void>(resolve=>{
   frame.onload=()=>resolve();
   readyPoll=setInterval(()=>{const doc=frame.contentDocument;if(doc?.readyState==='complete'&&doc.querySelector('main'))resolve();},50);
  });
  frame.srcdoc='<!doctype html>'+source.documentElement.outerHTML;
  document.body.appendChild(frame);await waitForExportStep(loaded,'layout',10000,signal);clearInterval(readyPoll);
  const doc=frame.contentDocument,win=frame.contentWindow;
  if(!doc||!win)throw Error('Article rendering unavailable');
  if(doc.fonts)await waitForExportStep(doc.fonts.ready,'fonts',5000,signal);
  for(const svg of doc.querySelectorAll('svg')){
   const image=doc.createElement('img'),css=win.getComputedStyle(svg);
   image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
   image.alt=svg.getAttribute('aria-label')??'';
   image.style.cssText=`width:${css.width};height:${css.height};display:block;padding:${css.padding};background:${css.backgroundColor};`;
   svg.replaceWith(image);
  }
  // Embedded browsers can leave image.decode() pending even after onload.
  await Promise.all([...doc.images].map(image=>waitForExportImage(image,signal)));
  const main=doc.querySelector('main')!,height=Math.ceil(main.getBoundingClientRect().height);
  const dimensions=exportDimensions(height,compactExportDevice());frame.style.height=`${height+4}px`;
  canvas=document.createElement('canvas');canvas.width=dimensions.width;canvas.height=dimensions.height;
  options.onProgress?.('render');
  await waitForExportStep(html2canvas(main,{
   canvas,scale:dimensions.scale,width:ARTICLE_EXPORT_LAYOUT_WIDTH,height,
   windowWidth:ARTICLE_EXPORT_LAYOUT_WIDTH,windowHeight:height+4,
   backgroundColor:'#f7f8f4',logging:false,useCORS:true,allowTaint:false,
   scrollX:0,scrollY:0,imageTimeout:8000,removeContainer:true,
  }),'render',18000,signal);
  options.onProgress?.('encode');
  const result=new Promise<Blob>((resolve,reject)=>canvas!.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed')),'image/png'));
  return await waitForExportStep(result,'encode',6000,signal);
 }finally{
  clearTimeout(total);clearInterval(readyPoll);controller.abort();options.signal?.removeEventListener('abort',cancel);
  frame.onload=null;frame.remove();if(canvas){canvas.width=1;canvas.height=1;}
 }
}

