import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {articleSchema,publicContentSchema} from '../lib/content.ts';
// The withdrawn historical edition predates the separate Hong Kong locale.
const languageCodes=['zh-CN','zh-TW','en','ja','ko','es','pt'];
import {selectLanguage,translationOf} from '../lib/guides.ts';

const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const originals=await read('../lib/launch-articles.json');
const translations=await read('../lib/article-translations.json');
// Historic editions remain recoverable source material, not public content.
const sectionEdition=await read('../lib/section-articles.json');
const snapshot=publicContentSchema.parse({articles:[...originals,...translations,...sectionEdition],contact:{email:'',phone:'',wechat:'',address:''},aiEnabled:false});
const editionIds=new Set([...originals,...translations].map(a=>a.id));
const launchSnapshot=snapshot.articles.filter(a=>editionIds.has(a.id));

test('five topics each have seven complete, selectable language versions',()=>{
 assert.equal(originals.length,5);assert.equal(translations.length,30);
 assert.equal(new Set(launchSnapshot.map(a=>a.id)).size,35);
 for(const original of originals){
  assert.deepEqual(snapshot.articles.find(a=>a.id===original.id),articleSchema.parse(original));
  for(const lang of languageCodes){
   const version=translationOf(original,snapshot.articles,lang);
   assert.ok(version,`${original.id} ${lang}`);
   assert.equal(version.language,lang);
   assert.equal(version.status,'published');assert.equal(version.demo,false);
  }
 }
 for(const lang of languageCodes){
  const selected=selectLanguage(launchSnapshot,lang);
  assert.equal(selected.length,5);assert.ok(selected.every(a=>a.language===lang));
 }
});

test('translations preserve full paragraph structure, citations, source identity and dates',()=>{
 for(const item of translations){
  const a=articleSchema.parse(item),source=originals.find(o=>o.id===a.guide.groupId);
  assert.ok(source);assert.notEqual(a.body,source.body);assert.notEqual(a.title,source.title);
  const paragraphs=a.body.split(/\n\n+/),originalParagraphs=source.body.split(/\n\n+/);
  assert.equal(paragraphs.length,originalParagraphs.length);
  paragraphs.forEach((p,i)=>{
   assert.equal(p.startsWith('## '),originalParagraphs[i].startsWith('## '));
   assert.deepEqual(p.match(/\[\d+\]/g),originalParagraphs[i].match(/\[\d+\]/g));
  });
  assert.equal(a.sourceUrl,source.sourceUrl);assert.equal(a.date,source.date);
  assert.equal(a.guide.editorial.preparedAt,source.guide.editorial.preparedAt);
  assert.deepEqual(a.guide.editorial.sources.map(({supports,...s})=>s),source.guide.editorial.sources.map(({supports,...s})=>s));
  assert.equal(a.guide.reviewState,'pending');assert.equal(a.guide.reviewedAt,'');
  assert.ok(/AI|IA/.test(a.guide.notes));assert.ok(a.guide.notes.length>70);
 }
});

test('all illustration assets exist and translated captions retain image provenance',async()=>{
 for(const a of translations){
  const source=originals.find(o=>o.id===a.guide.groupId);
  for(const [i,figure] of a.guide.editorial.figures.entries()){
   await access(new URL(`../public${figure.file}`,import.meta.url));
   assert.equal(figure.aiGenerated,source.guide.editorial.figures[i].aiGenerated);
   assert.equal(figure.afterParagraph,source.guide.editorial.figures[i].afterParagraph);
   assert.notEqual(figure.caption,source.guide.editorial.figures[i].caption);
   if(figure.aiGenerated){assert.equal(figure.file,source.guide.editorial.figures[i].file);assert.ok(figure.caption.includes('AI')||figure.caption.includes('IA'));}
   else{
    assert.ok(figure.file.includes(a.language));
    const svg=await readFile(new URL(`../public${figure.file}`,import.meta.url),'utf8');
    assert.ok(svg.includes(`lang="${a.language}"`));assert.ok(svg.includes('<desc>'));
   }
  }
 }
});

test('new business, talent and innovation topics are published in all seven languages',async()=>{
 const edition=await read('../lib/section-articles.json');
 assert.equal(edition.length,21);
 assert.equal(new Set(snapshot.articles.map(a=>a.id)).size,snapshot.articles.length);
 const originals=edition.filter(a=>a.language==='zh-CN');
 assert.deepEqual(originals.map(a=>a.category).sort(),['business','innovation','talent']);
 for(const source of originals){
  assert.ok(source.body.length>=600);
  assert.ok(source.guide.editorial.sources.length>=3);
  for(const ref of source.guide.editorial.sources){
   const host=new URL(ref.url).hostname;
   assert.ok(host.endsWith('.sz.gov.cn')||host==='www.apec.org');
  }
  for(const lang of languageCodes){
   const version=articleSchema.parse(translationOf(source,edition,lang));
   assert.equal(version.status,'published');assert.equal(version.demo,false);
   assert.equal(version.category,source.category);
   assert.deepEqual(snapshot.articles.find(a=>a.id===version.id),version);
   assert.equal(version.body.split(/\n\n+/).length,source.body.split(/\n\n+/).length);
   assert.deepEqual(version.body.match(/\[\d+\]/g),source.body.match(/\[\d+\]/g));
   assert.deepEqual(version.guide.editorial.sources.map(({supports,...s})=>s),source.guide.editorial.sources.map(({supports,...s})=>s));
   for(const f of version.guide.editorial.figures){
    await access(new URL(`../public${f.file}`,import.meta.url));
    assert.equal(f.aiGenerated,true);assert.ok(/AI|IA/.test(f.caption));
   }
  }
 }
 for(const lang of languageCodes){
  const selected=selectLanguage(snapshot.articles,lang);
  assert.equal(selected.length,8);assert.ok(selected.every(a=>a.language===lang));
  for(const category of ['business','talent','innovation'])assert.equal(selected.filter(a=>a.category===category).length,1);
 }
});
