"use client";
import {useEffect,useRef,useState} from "react";
import qrcode from "../vendor/qrcode-generator/qrcode.mjs";
import {siteHref,isPages} from "../lib/client-runtime";
import {guideCopy} from "../lib/guide-copy";
import {reviewDue} from "../lib/guides";
import type {Article,Language} from "../lib/content";
export function absoluteGuideUrl(a:Article,lang:Language){return new URL(siteHref(`/article/${a.id}?lang=${lang}`),location.href).href;}
export default function GuideShare({article:a,lang}:{article:Article;lang:Language}){
 const t=guideCopy[lang],[qr,setQr]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{try{const code=qrcode(0,"M");code.addData(absoluteGuideUrl(a,lang));code.make();setQr(code.createDataURL(6,24));}catch{setQr("");}},[a.id,lang]);
 async function download(){setBusy(true);setMessage("");try{
  await document.fonts.ready;
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
  if(a.guide?.editorial){add("参考来源 / References",true);a.guide.editorial.sources.forEach((source,i)=>{add(`[${i+1}] ${source.title}`);add(`${source.publisher} · ${source.publishedAt}`);add(source.url);});add("本长图为文字版；配图及AI生成说明请查看原文页面。");}
  if(reviewDue(a))add(t.outdated);add(`${t.source}: ${a.source||t.sourceMissing}`);if(a.sourceUrl)add(a.sourceUrl);
  add(`${t.published}: ${a.date}`);add(`${t.reviewed}: ${g?.reviewedAt||t.pending}`);if(g?.reviewDue)add(`${t.due}: ${g.reviewDue}`);
  add(t.disclaimer);add(t.qrHint);
  const parts=[];for(let i=0;i<rows.length;i+=200)parts.push(rows.slice(i,i+200));
  for(let i=0;i<parts.length;i++){
   canvas.height=150+parts[i].length*40+250;ctx.fillStyle="#f7f8f4";ctx.fillRect(0,0,900,canvas.height);ctx.fillStyle="#17635d";ctx.fillRect(0,0,900,12);
   parts[i].forEach((row,n)=>{ctx.font=row.title?'bold 30px Arial,"Microsoft YaHei",sans-serif':'24px Arial,"Microsoft YaHei",sans-serif';ctx.fillStyle=row.title?"#17635d":"#17313a";ctx.fillText(row.text,64,80+n*40);});
   if(qr){const img=new Image();img.src=qr;await img.decode();ctx.drawImage(img,64,canvas.height-215,180,180);}
   ctx.font="20px Arial";ctx.fillStyle="#718080";ctx.fillText(`${a.language} · ${i+1}/${parts.length}`,290,canvas.height-90);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),"image/png"));const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`${a.id}-${i+1}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
 }catch{setMessage(t.exportFailed);}finally{setBusy(false);}}
 return <div className="share-block"><div className="article-tools">{!a.demo&&<a className="button primary" href="#topic-contact" onClick={event=>{event.preventDefault();document.getElementById("topic-contact")?.scrollIntoView({behavior:"smooth"});}}>{t.consult}</a>}{a.sourceUrl&&<a className="button primary" href={a.sourceUrl} target="_blank" rel="noopener noreferrer">{t.original} ↗</a>}<button className="button light" onClick={async()=>{try{await navigator.clipboard.writeText(absoluteGuideUrl(a,lang));setMessage(t.copied);}catch{setMessage(absoluteGuideUrl(a,lang));}}}>{t.copy}</button><button className="button light" disabled={!qr} onClick={()=>dialog.current?.showModal()}>{t.qr}</button><button className="button light" disabled={busy} onClick={download}>{busy?t.exporting:a.guide?.editorial?(lang==="en"?"Download text image":lang==="zh-TW"?"下載文字長圖":"下载文字长图"):t.download}</button><button className="button light" onClick={()=>window.print()}>{t.print}</button></div><p className="editor-note">{isPages()?(lang==="en"?"The public preview link can be shared. Downloaded text images can be forwarded separately.":lang==="zh-TW"?"預覽連結可直接分享；下載的文字圖片可單獨轉發。":"预览链接可直接分享；下载的文字图片可单独转发。"):t.shareHint}</p>{message&&<p role="status" className="notice">{message}</p>}<dialog className="share-dialog" ref={dialog}><h2>{t.qr}</h2><p>{a.title}</p>{qr&&<img src={qr} width={240} height={240} alt={t.qr}/>}<p>{isPages()?(lang==="en"?"Scan to open this topic in the public preview.":lang==="zh-TW"?"掃碼查看此主題，公開預覽無需登入。":"扫码查看此主题，公开预览无需登录。"):t.qrHint}</p><button className="button primary" onClick={()=>dialog.current?.close()}>{t.close}</button></dialog></div>;
}
