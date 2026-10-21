import {readFile,writeFile} from 'node:fs/promises';
import {articleSchema} from '../lib/content.ts';
import {languageCodes} from '../lib/languages.ts';
const root=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const sources=await read('content/editions/2026-10-21/sources.json');
const notices=await read('content/translations/figures.json');
const originals=await read('content/editions/2026-10-21/zh-CN.json');
const edition=[];
for(const lang of languageCodes){
 const entries=await read(`content/editions/2026-10-21/${lang}.json`);
 if(entries.length!==3)throw Error(`Missing articles: ${lang}`);
 for(const [i,entry] of entries.entries()){
  const config=sources[i],base=originals[i];
  if(entry.body.split(/\n\n+/).length!==base.body.split(/\n\n+/).length)throw Error(`Paragraph count: ${lang} ${config.id}`);
  if(JSON.stringify(entry.body.match(/\[\d+\]/g))!==JSON.stringify(base.body.match(/\[\d+\]/g)))throw Error(`Citations: ${lang} ${config.id}`);
  if(entry.supports.length!==config.sources.length)throw Error(`References: ${lang} ${config.id}`);
  const article=articleSchema.parse({
   id:lang==='zh-CN'?config.id:`${config.id}-${lang}`,
   title:entry.title,summary:entry.summary,body:entry.body,
   category:config.category,kind:'insight',language:lang,
   source:lang==='zh-CN'?'立方匯编辑整理':notices[lang].edition,
   sourceUrl:config.sources[0].url,date:'2026-10-21',status:'published',featured:false,demo:false,
   updatedAt:'2026-10-21T03:00:00.000Z',
   guide:{groupId:config.id,audience:'',steps:'',materials:'',faqs:[],
    notes:lang==='zh-CN'?'公开资料核查于2026年10月21日。“专题观察”为编辑分析；原始报道中的后续计划不代表已经完成，页面入口不代表所有对象均符合条件。':notices[lang].notice,
    reviewedAt:lang==='zh-CN'?'2026-10-21':'',reviewDue:'2026-11-01',reviewState:'pending',
    editorial:{preparedAt:'2026-10-21',figures:[{file:config.image,alt:entry.caption,caption:entry.caption,aiGenerated:true,afterParagraph:-1}],sources:config.sources.map((s,n)=>({...s,supports:entry.supports[n]}))},
   },
  });
  edition.push(article);
 }
}
await writeFile(new URL('lib/section-articles.json',root),JSON.stringify(edition,null,2)+'\n');
const snapshot=await read('github-pages/public-content.json');
const ids=new Set(edition.map(a=>a.id));
snapshot.articles=[...snapshot.articles.filter(a=>!ids.has(a.id)),...edition];
await writeFile(new URL('github-pages/public-content.json',root),JSON.stringify(snapshot,null,2)+'\n');
console.log(`Compiled ${edition.length} section article versions; snapshot now has ${snapshot.articles.length} records.`);
