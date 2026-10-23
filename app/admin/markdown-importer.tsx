"use client";
import {useState,type ChangeEvent} from 'react';
import {apiFetch} from '../../lib/client-runtime';
import {languageCodes,languageLabels,isLanguage} from '../../lib/languages';
import type {Article,Language} from '../../lib/content';
import {parseMarkdownDocument,markdownImages,rewriteMarkdownImages,normalizeImagePath,decodeImageData,MAX_IMAGE_BYTES,MAX_TOTAL_IMAGE_BYTES,MAX_MARKDOWN} from '../../lib/markdown';
import MarkdownContent from '../markdown-content';
import {adminTopics} from '../../lib/topics';

const categories=adminTopics;
type Parsed=ReturnType<typeof parseMarkdownDocument>;
export default function MarkdownImporter({onImported,onCancel}:{onImported:(a:Article)=>void;onCancel:()=>void}){
 const [document,setDocument]=useState<Parsed|null>(null),[fileName,setFileName]=useState(''),[files,setFiles]=useState<File[]>([]),[title,setTitle]=useState(''),[summary,setSummary]=useState(''),[category,setCategory]=useState<keyof typeof categories>('apec'),[language,setLanguage]=useState<Language>('zh-CN'),[date,setDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})),[source,setSource]=useState('立方匯'),[sourceUrl,setSourceUrl]=useState(''),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(file:File){
  setError('');setPreview('');
  try{
   if(file.size>10*1024*1024)throw Error('Markdown 文件请控制在 10 MB 内，正文最多 20 万字，图片合计不超过 6 MB。');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()),value=parseMarkdownDocument(text,file.name);
   setDocument(value);setFileName(file.name);setTitle(value.title);setSummary(value.summary);
   const meta=value.metadata;
   if(typeof meta.category==='string'&&Object.hasOwn(categories,meta.category))setCategory(meta.category as keyof typeof categories);
   if(isLanguage(meta.language))setLanguage(meta.language);
   if(typeof meta.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(meta.date))setDate(meta.date);
   setSource(typeof meta.source==='string'?meta.source:'立方匯');setSourceUrl(typeof meta.sourceUrl==='string'?meta.sourceUrl:'');
  }catch(e){setDocument(null);setError((e as Error).message||'请使用 UTF-8 编码的 Markdown 文件。');}
 }
 function chooseMarkdown(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(file)void load(file);}
 async function addFiles(event:ChangeEvent<HTMLInputElement>){
  const chosen=[...(event.target.files??[])];setError('');setPreview('');
  const md=chosen.filter(f=>/\.(md|markdown)$/i.test(f.name));
  if(!document&&md.length===1)await load(md[0]);
  else if(!document&&md.length>1){setError('文件夹里有多份 Markdown，请先单独选择要导入的那一份。');}
  setFiles(previous=>{const map=new Map(previous.map(f=>[f.webkitRelativePath||f.name,f]));for(const file of chosen.filter(f=>! /\.(md|markdown)$/i.test(f.name)))map.set(file.webkitRelativePath||file.name,file);return [...map.values()];});
 }
 async function prepare(){
  if(!document)throw Error('请先选择 Markdown 文件。');
  const replacements=new Map<string,{path:string;data:string}>();let total=0;
  for(const ref of markdownImages(document.body)){
   if(/^https?:\/\//i.test(ref.url)||replacements.has(ref.url))continue;
   let data=ref.url.startsWith('data:')?ref.url:'';
   if(!data){
    if(/^[a-z][a-z0-9+.-]*:/i.test(ref.url)||ref.url.startsWith('//'))throw Error('图片请使用 http(s) 链接、内嵌图片或相对路径。');
    const target=normalizeImagePath(ref.url.replace(/^(?:\.\.\/)+/,''));
    const exact=files.filter(f=>{const path=normalizeImagePath(f.webkitRelativePath||f.name);return path===target||path.endsWith('/'+target);});
    const candidates=exact.length?exact:files.filter(f=>!f.webkitRelativePath&&normalizeImagePath(f.name)===target.split('/').at(-1));
    if(!candidates.length)throw Error(`缺少图片「${ref.url}」，请补充选择图片或所在文件夹。`);
    if(candidates.length>1)throw Error(`图片「${ref.url}」匹配到多个文件，请用更完整的相对路径。`);
    const file=candidates[0];if(file.size>MAX_IMAGE_BYTES)throw Error(`图片「${file.name}」超过 2 MB，请先压缩。`);
    const mime=/\.png$/i.test(file.name)?'image/png':/\.jpe?g$/i.test(file.name)?'image/jpeg':/\.webp$/i.test(file.name)?'image/webp':/\.gif$/i.test(file.name)?'image/gif':'';
    if(!mime)throw Error('本地图片仅支持 PNG、JPEG、WebP、GIF，不支持 SVG。');
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    data=`data:${mime};base64,${btoa(binary)}`;
   }
   total+=decodeImageData(data).bytes.length;
   if(total>MAX_TOTAL_IMAGE_BYTES||replacements.size>=12)throw Error('每次最多 12 张图片，图片合计不超过 6 MB。');
   replacements.set(ref.url,{path:`image-${replacements.size+1}`,data});
  }
  const body=rewriteMarkdownImages(document.body,url=>replacements.get(url)?.path??url);
  if(body.length>MAX_MARKDOWN)throw Error('正文超过 20 万字，请拆分文章后导入。');
  return {body,images:[...replacements.values()],preview:rewriteMarkdownImages(document.body,url=>replacements.get(url)?.data??url)};
 }
 async function showPreview(){setBusy(true);setError('');try{setPreview((await prepare()).preview);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function importDraft(){
  setBusy(true);setError('');
  try{
   const prepared=await prepare();
   const response=await apiFetch('/api/admin/markdown-import',{method:'POST',body:JSON.stringify({title,summary,category,language,date,source,sourceUrl,sourceFile:fileName,body:prepared.body,images:prepared.images})});
   const value=await response.json() as {article:Article;error?:string};if(!response.ok)throw Error(value.error||'导入失败，请重试。');onImported(value.article);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 function template(){
  const text='---\ntitle: 我的文章标题\nsummary: 用一两句话介绍文章。\ncategory: business\n# apec=APEC 与深圳；innovation=产业与创新；business=经贸与营商；talent=城市与生活\nlanguage: zh-CN\n---\n\n## 第一部分\n\n这里是正文，可以使用 **粗体**、*斜体* 和 [原文链接](https://example.com)。\n\n- 第一项\n- 第二项\n\n> 这是一段引用。\n\n| 项目 | 说明 |\n| --- | --- |\n| 示例 | 表格内容 |\n\n![图片说明](images/photo.jpg "图片来源或 AI 生成说明")\n';
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=window.document.createElement('a');a.href=url;a.download='文章导入模板.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="editor markdown-importer"><div className="section-head"><div><h2>导入 Markdown 文章</h2><p className="editor-note">选择文件 → 检查图片和预览 → 保存草稿。之后在编辑器内发布。</p></div><button className="button light" type="button" disabled={busy} onClick={onCancel}>关闭</button></div>
  <div className="markdown-upload-options"><label className="field">Markdown 文件<input type="file" accept=".md,.markdown" disabled={busy} onChange={chooseMarkdown}/></label><label className="field">补充本地图片（可多选）<input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" multiple disabled={busy} onChange={addFiles}/></label><label className="field">或选择文章所在文件夹<input type="file" multiple {...{webkitdirectory:''}} disabled={busy} onChange={addFiles}/></label></div>
  <p className="editor-note">网络图片可直接使用；相对路径图片请同时选择对应图片或整个文件夹。支持内嵌图片，单张最多 2 MB、合计 6 MB、最多 12 张。网络图片仍由原网站提供，建议使用稳定的 HTTPS 图片链接。</p>
  <button className="text-link" type="button" onClick={template}>下载 Markdown 模板</button>
  {fileName&&<p className="notice">已选择 {fileName} · 补充文件 {files.length} 个</p>}
  {document&&<><div className="form-grid"><label className="field">文章标题 *<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field">所属板块<select value={category} onChange={e=>setCategory(e.target.value as keyof typeof categories)}>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="field">文章语言<select value={language} onChange={e=>setLanguage(e.target.value as Language)}>{languageCodes.map(code=><option key={code} value={code}>{languageLabels[code]}</option>)}</select></label><label className="field">发布日期<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><label className="field">摘要 *<textarea maxLength={700} rows={3} value={summary} onChange={e=>setSummary(e.target.value)}/></label><div className="form-grid"><label className="field">来源<input maxLength={120} value={source} onChange={e=>setSource(e.target.value)}/></label><label className="field">来源链接<input type="url" maxLength={1000} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label></div>
  <p className="editor-note">支持标题、粗斜体、嵌套列表、任务清单、引用、表格、链接、分隔线、代码块及图片。为保证页面稳定，不执行文件中的 HTML、脚本、外部样式、Mermaid 或 LaTeX 扩展。</p>
  <div className="editor-actions"><button className="button light" type="button" disabled={busy} onClick={showPreview}>{busy?'处理中…':'检查并预览'}</button><button className="button primary" type="button" disabled={busy||!preview||!title.trim()||!summary.trim()} onClick={importDraft}>{busy?'处理中…':'导入为草稿'}</button></div>
  {preview&&<div className="markdown-import-preview"><h2>{title}</h2><p className="editor-note">{summary}</p><MarkdownContent body={preview} id="import-preview" preview/></div>}</>}
  {error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
