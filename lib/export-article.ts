import html2canvas from '../vendor/html2canvas/html2canvas.esm.js';

export const ARTICLE_EXPORT_LAYOUT_WIDTH=430;
export const ARTICLE_EXPORT_IMAGE_WIDTH=1080;

// The same HTML supplies both the reading view and the image. No image endpoint
// or model API is involved; each click renders a fresh, fixed-width document.
export async function exportArticleHtml(html:string):Promise<Blob>{
 const source=new DOMParser().parseFromString(html,'text/html');
 source.querySelectorAll('script,iframe,object,embed,base,dialog,meta[http-equiv],.actions').forEach(node=>node.remove());
 for(const node of source.querySelectorAll('*'))for(const attribute of [...node.attributes]){
  if(attribute.name.toLowerCase().startsWith('on'))node.removeAttribute(attribute.name);
 }
 if(!source.querySelector('main'))throw Error('Article body unavailable');
 const style=source.createElement('style');
 style.textContent=`html,body{margin:0!important;padding:0!important;width:${ARTICLE_EXPORT_LAYOUT_WIDTH}px!important;background:#f0f5f8!important}main{margin:0!important;box-shadow:none!important}.actions{display:none!important}.source a{text-decoration:none!important}`;
 source.head.appendChild(style);
 const frame=document.createElement('iframe');
 frame.setAttribute('sandbox','allow-same-origin');
 frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
 frame.style.cssText=`position:fixed;left:-10000px;top:0;width:${ARTICLE_EXPORT_LAYOUT_WIDTH}px;height:1000px;border:0;pointer-events:none;`;
 try{
  const loaded=new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Article rendering timed out')),15000);
   frame.onload=()=>{clearTimeout(timeout);resolve();};
  });
  frame.srcdoc='<!doctype html>'+source.documentElement.outerHTML;
  document.body.appendChild(frame);await loaded;
  const doc=frame.contentDocument,win=frame.contentWindow;
  if(!doc||!win)throw Error('Article rendering unavailable');
  await doc.fonts.ready;
  // Rasterize the inline source QR too, so it is retained by the canvas renderer.
  for(const svg of doc.querySelectorAll('svg')){
   const image=doc.createElement('img'),css=win.getComputedStyle(svg);
   image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
   image.alt=svg.getAttribute('aria-label')??'原文二维码';
   image.style.cssText=`width:${css.width};height:${css.height};display:block;padding:${css.padding};background:${css.backgroundColor};`;
   svg.replaceWith(image);
  }
  await Promise.all([...doc.images].map(async image=>{
   image.loading='eager';await image.decode();
   if(!image.naturalWidth)throw Error('An article image could not be loaded');
  }));
  const main=doc.querySelector('main')!;
  const height=Math.ceil(main.getBoundingClientRect().height);
  if(height<100||height>15000)throw Error('Article height unsupported');
  frame.style.height=`${height+4}px`;
  const scale=ARTICLE_EXPORT_IMAGE_WIDTH/ARTICLE_EXPORT_LAYOUT_WIDTH;
  const canvas=document.createElement('canvas');
  canvas.width=ARTICLE_EXPORT_IMAGE_WIDTH;canvas.height=Math.ceil(height*scale);
  await html2canvas(main,{
   canvas,scale,width:ARTICLE_EXPORT_LAYOUT_WIDTH,height,
   windowWidth:ARTICLE_EXPORT_LAYOUT_WIDTH,windowHeight:height+4,
   backgroundColor:'#f0f5f8',logging:false,useCORS:true,allowTaint:false,
   scrollX:0,scrollY:0,imageTimeout:15000,removeContainer:true,
  });
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed')),'image/png'));
 }finally{frame.remove();}
}

