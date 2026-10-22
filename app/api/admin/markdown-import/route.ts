import {env} from 'cloudflare:workers';
import {articleSchema,guideSchema} from '../../../../lib/content';
import {requireAdmin} from '../../../../lib/server';
import {authRateLimit} from '../../../../lib/auth';
import {getDb} from '../../../../db';
import {articles} from '../../../../db/schema';
import {decodeImageData,MAX_IMPORT_BYTES,MAX_TOTAL_IMAGE_BYTES,markdownImages,rewriteMarkdownImages,safeMarkdownUrl,normalizeImagePath} from '../../../../lib/markdown';
import {imageKey} from '../../../../lib/markdown-storage';
import {readLimitedText} from '../../../../lib/gateway';

export async function POST(request:Request){
 const denied=await requireAdmin(request);if(denied)return denied;
 if(!await authRateLimit(request,'markdown-import'))return Response.json({error:'导入次数较多，请稍后再试。'},{status:429});
 const stored:string[]=[];let committed=false;
 try{
  const input=JSON.parse(await readLimitedText(request,MAX_IMPORT_BYTES));
  if(typeof input.body!=='string'||typeof input.sourceFile!=='string'||!Array.isArray(input.images)||input.images.length>12)throw Error('导入内容格式无效。');
  const id=crypto.randomUUID(),assets=new Map<string,string>();let total=0;
  for(const asset of input.images){
   if(typeof asset?.path!=='string'||typeof asset?.data!=='string'||asset.path.length>1000)throw Error('图片资料格式无效。');
   const path=normalizeImagePath(asset.path);if(assets.has(path))throw Error('存在同名图片，请使用不同的文件夹路径。');assets.set(path,asset.data);
  }
  const refs=markdownImages(input.body),needed=new Map<string,{bytes:Uint8Array;mime:string;hash:string}>();
  for(const ref of refs){
   if(/^https?:\/\//i.test(ref.url))continue;
   const data=ref.url.startsWith('data:')?ref.url:assets.get(normalizeImagePath(ref.url));
   if(!data)throw Error(`缺少本地图片：${ref.url}`);
   if(needed.has(ref.url))continue;
   const {bytes,mime}=decodeImageData(data);total+=bytes.length;
   if(total>MAX_TOTAL_IMAGE_BYTES||needed.size>=12)throw Error('每次最多导入 12 张图片，图片合计不超过 6 MB。');
   const digest=await crypto.subtle.digest('SHA-256',bytes as BufferSource),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
   needed.set(ref.url,{bytes,mime,hash});
  }
  if(needed.size&&!env.BUCKET)return Response.json({error:'图片存储暂不可用，请稍后重试。'},{status:503});
  const body=rewriteMarkdownImages(input.body,url=>needed.has(url)?`/api/article-images/${id}/${needed.get(url)!.hash}`:url);
  for(const ref of markdownImages(body))if(!safeMarkdownUrl(ref.url,true))throw Error('图片地址不受支持。');
  const article=articleSchema.parse({id,title:input.title,summary:input.summary,body,category:input.category,language:input.language,date:input.date,source:input.source??'',sourceUrl:input.sourceUrl??'',kind:'insight',status:'draft',featured:false,demo:false,updatedAt:new Date().toISOString(),guide:guideSchema.parse({format:'markdown',markdown:{sourceFile:input.sourceFile,cover:markdownImages(body)[0]?.url},reviewState:'pending'})});
  for(const {bytes,mime,hash} of needed.values()){
   const key=imageKey(id,hash);await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:mime}});stored.push(key);
  }
  await getDb().insert(articles).values({...article,guide:article.guide??null,updatedAt:article.updatedAt!});committed=true;
  return Response.json({ok:true,article,imageCount:needed.size},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  return Response.json({error:error instanceof Error&&!(error.name==='ZodError')?error.message:'请检查标题、摘要、日期和正文长度。'},{status:400,headers:{'Cache-Control':'no-store'}});
 }finally{if(!committed&&stored.length&&env.BUCKET)await Promise.allSettled(stored.map(key=>env.BUCKET!.delete(key)));}
}
