"use client";
import {useEffect,useRef,useState} from "react";
import {siteHref,isPages} from "../lib/client-runtime";
import {loadArticleHtml,articleDocumentUrl} from '../lib/article-cache';
import {compactExportDevice,waitForExportStep,ExportTimeoutError} from '../lib/export-safety';
import {guideUiCopy} from "../lib/guide-ui-copy";
import {guideCopy} from "../lib/guide-copy";
import {reviewDue} from "../lib/guides";
import type {Article,Language} from "../lib/content";
export function absoluteGuideUrl(a:Article,lang:Language){return new URL(siteHref(`/article/${a.id}?lang=${lang}`),location.href).href;}
export default function GuideShare({article:a,lang}:{article:Article;lang:Language}){
 const t=guideCopy[lang],ui=guideUiCopy[lang],[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[exportPreview,setExportPreview]=useState(""),[phase,setPhase]=useState(""),exportController=useRef<AbortController|null>(null);
 useEffect(()=>()=>exportController.current?.abort(),[]);
 useEffect(()=>()=>{if(exportPreview)URL.revokeObjectURL(exportPreview);},[exportPreview]);
 useEffect(()=>{if(!a.guide?.edition)return;const timer=setTimeout(()=>{void import('../lib/export-article').catch(()=>{});},800);return()=>clearTimeout(timer);},[a.guide?.edition]);
 async function download(){if(busy)return;const controller=new AbortController();exportController.current=controller;setBusy(true);setMessage("");setPhase(t.exporting);try{
  if(a.guide?.edition){
   const edition=a.guide.edition;
   const blob=await waitForExportStep((async()=>{
    const html=await loadArticleHtml(edition.html);
    const {exportArticleHtml}=await import('../lib/export-article');
    return exportArticleHtml(html,articleDocumentUrl(edition.html),{signal:controller.signal,onProgress:stage=>{if(!controller.signal.aborted)setPhase(lang==="zh-CN"?({images:"正在准备图片…",layout:"正在排版…",render:"正在生成长图…",encode:"正在保存图片…"}[stage]):t.exporting);}});
   })(),'total',45000,controller.signal);
   const url=URL.createObjectURL(blob);setExportPreview(url);
   if(!compactExportDevice()){
    const link=document.createElement('a');link.href=url;link.download=`${a.id}.png`;document.body.appendChild(link);link.click();link.remove();
   }
   return;
  }
  await waitForExportStep(document.fonts.ready,'fonts',5000,controller.signal);
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");if(!ctx)throw Error();canvas.width=900;
  const rows:{text:string;title?:boolean}[]=[];
  function add(text:string,title=false){
   ctx!.font=title?'bold 30px Arial,"Microsoft YaHei",sans-serif':'24px Arial,"Microsoft YaHei",sans-serif';
   for(const paragraph of text.split("\n")){
    let line="";const tokens=paragraph.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*|\s+|[^\s]/gu)??[];
    for(const token of tokens){if(ctx!.measureText(line+token).width>772&&line){rows.push({text:line.trimEnd(),title});line="";}
     for(const char of token){if(ctx!.measureText(line+char).width>772){rows.push({text:line.trimEnd(),title});line="";}if(line||char.trim())line+=char;}
    }rows.push({text:line,title});
   }rows.push({text:""});
  }
  add("立方匯 · HEX CUBES",true);if(a.demo)add(t.sample,true);add(a.title,true);add(a.summary);
  const g=a.guide;for(const [heading,body] of [[t.audience,g?.audience],[t.overview,a.body],[t.steps,g?.steps],[t.materials,g?.materials],[t.notes,g?.notes]] as const){if(body){add(heading,true);add(body);}}
  if(g?.faqs.length){add(t.faq,true);g.faqs.forEach(f=>{add(f.q,true);add(f.a);});}
  if(a.guide?.editorial){add(ui.references,true);a.guide.editorial.sources.forEach((source,i)=>{add(`[${i+1}] ${source.title}`);add(`${source.publisher} · ${source.publishedAt}`);add(source.url);});add(ui.textImageNote);}
  if(reviewDue(a))add(t.outdated);add(`${t.source}: ${a.source||t.sourceMissing}`);if(a.sourceUrl)add(a.sourceUrl);
  add(`${t.published}: ${a.date}`);add(`${t.reviewed}: ${g?.reviewedAt||t.pending}`);if(g?.reviewDue)add(`${t.due}: ${g.reviewDue}`);
  add(t.disclaimer);
  const parts=[];for(let i=0;i<rows.length;i+=200)parts.push(rows.slice(i,i+200));
  for(let i=0;i<parts.length;i++){
   canvas.height=150+parts[i].length*40+250;ctx.fillStyle="#f7f8f4";ctx.fillRect(0,0,900,canvas.height);ctx.fillStyle="#17635d";ctx.fillRect(0,0,900,12);
   parts[i].forEach((row,n)=>{ctx.font=row.title?'bold 30px Arial,"Microsoft YaHei",sans-serif':'24px Arial,"Microsoft YaHei",sans-serif';ctx.fillStyle=row.title?"#17635d":"#17313a";ctx.fillText(row.text,64,80+n*40);});
   ctx.font="20px Arial";ctx.fillStyle="#718080";ctx.fillText(`${a.language} · ${i+1}/${parts.length}`,290,canvas.height-90);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),"image/png"));const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`${a.id}-${i+1}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
 }catch(error){setMessage(lang==="zh-CN"?(error instanceof ExportTimeoutError?"生成超时，已停止等待。请重试，或在系统浏览器打开后导出。":(error instanceof Error&&error.name==="AbortError")?"生成已停止，可重新尝试。":"未能生成长图，请检查网络后重试；也可在系统浏览器打开后导出。") :t.exportFailed);}finally{controller.abort();exportController.current=null;setBusy(false);setPhase("");}}
 return <div className="share-block"><div className="article-tools">{a.sourceUrl&&<a className="button primary" href={a.sourceUrl} target="_blank" rel="noopener noreferrer">{t.original} ↗</a>}<button className="button light" onClick={async()=>{try{await navigator.clipboard.writeText(absoluteGuideUrl(a,lang));setMessage(t.copied);}catch{setMessage(absoluteGuideUrl(a,lang));}}}>{t.copy}</button><button className="button light" disabled={busy} onClick={download}>{busy?(phase||t.exporting):a.guide?.edition?t.download:a.guide?.editorial?ui.textDownload:t.download}</button>{busy&&<button className="button light" onClick={()=>exportController.current?.abort()}>{lang==="zh-CN"?"取消生成":"Cancel"}</button>}<button className="button light" onClick={()=>window.print()}>{t.print}</button></div><p className="editor-note">{a.guide?.edition?(lang==="zh-CN"?"按固定版式现场导出，保留完整文字与照片，可长按保存转发。":t.shareHint):isPages()?ui.publicShareHint:t.shareHint}</p>{message&&<p role="status" className="notice">{message}</p>}{exportPreview&&<div className="export-overlay"><div className="share-dialog export-image-preview" role="dialog" aria-modal="true" aria-label={t.download}><h2>{t.download}</h2><img src={exportPreview} alt={a.title}/><p>{lang==="zh-CN"?"长按图片可保存；也可点击下方按钮下载。":t.shareHint}</p><a className="button primary" href={exportPreview} download={`${a.id}.png`}>{lang==="zh-CN"?"保存图片":t.download}</a> <button className="button light" onClick={()=>setExportPreview("")}>{t.close}</button></div></div>}</div>;
}

