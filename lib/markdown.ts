import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {parseDocument} from 'yaml';

export const MAX_MARKDOWN=200000;
export const MAX_IMAGE_BYTES=2*1024*1024;
export const MAX_TOTAL_IMAGE_BYTES=6*1024*1024;
export const MAX_IMPORT_BYTES=12*1024*1024;
export const uploadedImagePattern=/^\/api\/article-images\/([a-zA-Z0-9_-]{1,80})\/([a-f0-9]{64})$/;
export type MarkdownNode={type:string;value?:string;url?:string;alt?:string;title?:string|null;identifier?:string;depth?:number;children?:MarkdownNode[];position?:{start:{offset?:number};end:{offset?:number}};data?:{hProperties?:Record<string,unknown>}};
export function markdownTree(value:string){return unified().use(remarkParse).use(remarkGfm).parse(value) as MarkdownNode;}
export function walkMarkdown(node:MarkdownNode,visit:(n:MarkdownNode)=>void){visit(node);for(const child of node.children??[])walkMarkdown(child,visit);}
export function nodeText(node:MarkdownNode):string{return node.type==='image'||node.type==='imageReference'?'':node.value??(node.children??[]).map(nodeText).join('');}
export function parseMarkdownDocument(input:string,fileName:string){
 let body=input.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 let metadata:Record<string,unknown>={};
 if(body.startsWith('---\n')){
  const match=/^---\n([\s\S]*?)\n(?:---|\.\.\.)\s*(?:\n|$)/.exec(body);
  if(!match||match[1].length>12000)throw Error('文章顶部信息格式有误，请检查 --- 分隔符。');
  const document=parseDocument(match[1],{schema:'core',uniqueKeys:true});
  if(document.errors.length)throw Error('文章顶部信息无法读取：'+document.errors[0].message.split('\n')[0]);
  const value=document.toJS({maxAliasCount:0});
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('文章顶部信息应为 title、summary 等字段。');
  metadata=value;body=body.slice(match[0].length);
 }
 const tree=markdownTree(body),first=tree.children?.[0];
 const string=(key:string)=>typeof metadata[key]==='string'?metadata[key] as string:'';
 const title=string('title')||(first?.type==='heading'&&first.depth===1?nodeText(first):fileName.replace(/\.(md|markdown)$/i,''));
 if(first?.type==='heading'&&first.depth===1&&nodeText(first).trim()===title.trim())body=body.slice(first.position?.end.offset??0).trimStart();
 const paragraph=markdownTree(body).children?.find(n=>n.type==='paragraph');
 const summary=string('summary')||string('description')||(paragraph?nodeText(paragraph).slice(0,300):title);
 if(!body.trim())throw Error('Markdown 文件没有正文，请在标题下方添加内容。');
 return {title:title.trim(),summary:summary.trim(),body:body.trim(),metadata};
}
export type MarkdownImageRef={url:string;alt:string;title?:string|null;start:number;end:number};
export function markdownImages(markdown:string):MarkdownImageRef[]{
 const tree=markdownTree(markdown),definitions=new Map<string,MarkdownNode>(),result:MarkdownImageRef[]=[];
 walkMarkdown(tree,n=>{if(n.type==='definition'&&n.identifier)definitions.set(n.identifier.toLowerCase(),n);});
 walkMarkdown(tree,n=>{
  if(n.type!=='image'&&n.type!=='imageReference')return;
  const target=n.type==='image'?n:definitions.get(n.identifier?.toLowerCase()??'');
  if(!target?.url)throw Error('有图片引用没有对应的地址定义。');
  result.push({url:target.url,alt:n.alt??'',title:target.title,start:n.position!.start.offset!,end:n.position!.end.offset!});
 });
 return result;
}
export function rewriteMarkdownImages(markdown:string,resolve:(url:string)=>string){
 const refs=markdownImages(markdown);let result=markdown;
 for(const ref of [...refs].reverse()){
  const url=resolve(ref.url);if(url===ref.url)continue;
  const alt=ref.alt.replace(/[\\\[\]]/g,'\\$&');
  const title=ref.title?` "${ref.title.replace(/[\\"]/g,'\\$&')}"`:'';
  result=result.slice(0,ref.start)+`![${alt}](<${url}>${title})`+result.slice(ref.end);
 }
 return result;
}
export function normalizeImagePath(value:string){
 let decoded:string;try{decoded=decodeURIComponent(value.split(/[?#]/)[0]);}catch{throw Error('图片路径编码无效。');}
 const parts:string[]=[];
 for(const part of decoded.replace(/\\/g,'/').replace(/^\.\//,'').split('/')){
  if(!part||part==='.')continue;
  if(part==='..'){if(!parts.length)throw Error('图片路径超出了所选文件夹。');parts.pop();}else parts.push(part);
 }
 return parts.join('/');
}
export function safeMarkdownUrl(url:string,image=false){
 if(image)return /^https?:\/\//i.test(url)||uploadedImagePattern.test(url)||/^data:image\/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(url);
 return /^https?:\/\//i.test(url)||/^mailto:/i.test(url)||/^tel:/i.test(url)||url.startsWith('#');
}
export function decodeImageData(data:string){
 const match=/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/]*={0,2})$/.exec(data);
 if(!match||match[2].length>Math.ceil(MAX_IMAGE_BYTES/3)*4+4)throw Error('仅支持不超过 2 MB 的 PNG、JPEG、WebP、GIF 图片。');
 let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));}catch{throw Error('图片编码无效。');}
 const has=(offset:number,values:number[])=>values.every((v,i)=>bytes[offset+i]===v);
 const mime=match[1];
 const valid=mime==='image/png'?has(0,[137,80,78,71,13,10,26,10]):mime==='image/jpeg'?has(0,[255,216,255]):mime==='image/gif'?has(0,[71,73,70,56])&&(bytes[4]===55||bytes[4]===57)&&bytes[5]===97:has(0,[82,73,70,70])&&has(8,[87,69,66,80]);
 if(!valid||!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw Error('图片内容与格式不符，或图片超过 2 MB。');
 return {bytes,mime};
}
export function headingSlug(text:string){return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');}
export function markdownHeadingIds(options:{prefix:string}){
 return (tree:MarkdownNode)=>{const counts=new Map<string,number>();walkMarkdown(tree,n=>{
  if(n.type!=='heading')return;const slug=headingSlug(nodeText(n))||'section',count=counts.get(slug)??0;counts.set(slug,count+1);
  n.data={...n.data,hProperties:{...n.data?.hProperties,id:`${options.prefix}-${slug}${count?'-'+count:''}`}};
 });};
}
