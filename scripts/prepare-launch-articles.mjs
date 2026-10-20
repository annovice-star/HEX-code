import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
// Content preparation is local tooling; pass the available sharp module path.
const {default:sharp}=await import(pathToFileURL(path.resolve(process.argv[3])).href);
const root=process.cwd();
const source=path.resolve(process.argv[2]);
const draft=JSON.parse(await fs.readFile(path.join(source,'drafts.json'),'utf8'));
const assetRoot=path.join(root,'public','article-images');
await fs.mkdir(assetRoot,{recursive:true});
const bundle=[];
for(const [index,a] of draft.articles.entries()){
 const paragraphs=a.sections.flatMap(s=>[`## ${s.heading}`,...s.paragraphs]);
 paragraphs.push('## 阅读提示',a.takeaway);
 const figures=[];
 for(const [i,f] of a.figures.entries()){
  const name=`${a.id}-${i+1}.webp`;
  // Format compression only: preserve the full image, including its AI label.
  await sharp(path.join(source,f.file)).webp({quality:86}).toFile(path.join(assetRoot,name));
  figures.push({file:`/article-images/${name}`,alt:f.alt,caption:f.caption,aiGenerated:!!f.aiGenerated,afterParagraph:i===0?-1:a.sections[0].paragraphs.length});
 }
 bundle.push({id:a.id,title:a.title,summary:a.summary,body:paragraphs.join('\n\n'),category:'apec',kind:'insight',language:'zh-CN',
  source:'立方匯编辑整理',sourceUrl:a.sources[0].url,date:draft.preparedAt,status:'published',featured:index===0,demo:false,
  updatedAt:'2026-10-20T07:00:00.000Z',
  guide:{groupId:a.id,audience:'',steps:'',materials:'',notes:'',faqs:[],reviewedAt:draft.preparedAt,reviewDue:'2026-11-01',reviewState:'pending',
   editorial:{preparedAt:draft.preparedAt,figures,sources:a.sources.map(s=>({title:s.title,publisher:s.publisher,url:s.url,publishedAt:s.publishedAt??'',supports:s.supports??''}))}},
 });
}
assert.equal(bundle.length,5);
assert.equal(bundle.flatMap(a=>a.guide.editorial.sources).length,17);
assert.equal(bundle.flatMap(a=>a.guide.editorial.figures).filter(f=>f.aiGenerated).length,5);
await fs.writeFile(path.join(root,'lib','launch-articles.json'),JSON.stringify(bundle,null,2)+'\n');
const snapshotPath=path.join(root,'github-pages','public-content.json');
const snapshot=JSON.parse(await fs.readFile(snapshotPath,'utf8'));
const ids=new Set(bundle.map(a=>a.id));
snapshot.articles=[...bundle,...snapshot.articles.filter(a=>!ids.has(a.id))];
await fs.writeFile(snapshotPath,JSON.stringify(snapshot,null,2)+'\n');
console.log(JSON.stringify({articles:bundle.length,references:17,images:bundle.flatMap(a=>a.guide.editorial.figures).length,assets:assetRoot}));
