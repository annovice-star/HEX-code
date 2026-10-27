import test from 'node:test';
import assert from 'node:assert/strict';
import { articleSchema, retrieve, demos,publicContentSchema,emptyContact } from '../lib/content.ts';
import {selectLanguage,translationOf,reviewDue,searchable} from '../lib/guides.ts';
import {inquirySchema} from '../lib/inquiries.ts';
import {readFileSync,existsSync} from 'node:fs';

const base = {...demos[0], id:'real-article',status:'published',demo:false,title:'企业落地与办公空间',summary:'团队落地前的准备',body:'企业可按团队规模梳理办公空间需求。'};
test('public preview excludes drafts and administrative data and keeps AI disabled',()=>{
  const data=publicContentSchema.parse({articles:[base,{...base,id:'draft',status:'draft'}],contact:emptyContact,aiEnabled:false,username:'admin',inquiries:[{email:'private@example.com'}],token:'private'});
  assert.deepEqual(data.articles.map(a=>a.id),['real-article']);assert.deepEqual(Object.keys(data),['articles','contact','aiEnabled']);
  assert.throws(()=>publicContentSchema.parse({...data,aiEnabled:true}));
});
test('retrieval excludes drafts and demo materials even when they match exactly',()=>{
  const hits=retrieve('企业落地',[base,{...base,id:'draft',status:'draft'},{...base,id:'demo',demo:true}],'zh-CN');
  assert.deepEqual(hits.map(a=>a.id),['real-article']);
});
test('English and Traditional Chinese business queries can find Chinese service content',()=>{
  assert.equal(retrieve('company office space',[base],'en')[0]?.id,'real-article');
  assert.equal(retrieve('企業辦公空間',[base],'zh-TW')[0]?.id,'real-article');
});
test('unrelated questions return no evidence instead of filler documents',()=>{
  assert.equal(retrieve('weather forecast tomorrow',[base],'en').length,0);
});
test('source links reject executable URL protocols',()=>{
  assert.equal(articleSchema.safeParse({...base,sourceUrl:'javascript:alert(1)'}).success,false);
  assert.equal(articleSchema.safeParse({...base,sourceUrl:'https://example.com/article'}).success,true);
});

test('prepared editions only embed local article assets, and retain searchable text',()=>{
 const edition=JSON.parse(readFileSync(new URL('../lib/auto-export-article.json',import.meta.url),'utf8'));
 const article=articleSchema.parse(edition);
 assert.equal(article.category,'innovation');
 assert.equal(article.guide.editorial.sources.length,1);
 assert.ok(searchable(article).includes('阿联酋'));
 for(const file of Object.values(article.guide.edition))assert.ok(existsSync(new URL('../public'+file,import.meta.url)));
 for(const html of ['https://example.com/index.html','javascript:alert(1)','/article-editions/../admin/index.html']){
  assert.equal(articleSchema.safeParse({...edition,guide:{...edition.guide,edition:{...edition.guide.edition,html}}}).success,false);
 }
});
test('archived launch edition retains source citations and labelled local images',()=>{
 const bundle=JSON.parse(readFileSync(new URL('../lib/launch-articles.json',import.meta.url),'utf8'));
 const snapshot=publicContentSchema.parse(JSON.parse(readFileSync(new URL('../github-pages/public-content.json',import.meta.url),'utf8')));
 assert.equal(bundle.length,5);
 assert.equal(bundle.flatMap(a=>a.guide.editorial.sources).length,17);
 assert.equal(bundle.flatMap(a=>a.guide.editorial.figures).length,7);
 for(const raw of bundle){
  const a=articleSchema.parse(raw);
  assert.equal(snapshot.articles.some(current=>current.id===a.id),false);
  assert.equal(a.status,'published');assert.equal(a.demo,false);
  for(const match of a.body.matchAll(/\[(\d+)\]/g))assert.ok(a.guide.editorial.sources[Number(match[1])-1]);
  for(const figure of a.guide.editorial.figures){
   assert.ok(existsSync(new URL('../public'+figure.file,import.meta.url)));
   if(figure.aiGenerated){assert.match(figure.caption,/^AI生成/);assert.match(figure.alt,/^AI生成/);}
  }
 }
 const policy=bundle.find(a=>a.id==='apec-2026-shenzhen-official-navigation');
 for(const source of policy.guide.editorial.sources)assert.match(new URL(source.url).hostname,/(^|\.)sz\.gov\.cn$/);
 const malicious=structuredClone(bundle[0]);
 malicious.guide.editorial.sources[0].url='javascript:alert(1)';
 assert.equal(articleSchema.safeParse(malicious).success,false);
 malicious.guide.editorial.sources[0].url=bundle[0].guide.editorial.sources[0].url;
 malicious.guide.editorial.figures[0].file='//untrusted.example/tracker.png';
 assert.equal(articleSchema.safeParse(malicious).success,false);
});
test('empty content and oversized bodies cannot be published',()=>{
  assert.equal(articleSchema.safeParse({...base,title:'   '}).success,false);
  assert.equal(articleSchema.safeParse({...base,body:'x'.repeat(200001)}).success,false);
});
test('language selection groups translations without hiding unrelated guides',()=>{
 const cn={...base,guide:{groupId:'same-topic'}},en={...base,id:'english',language:'en',guide:{groupId:'same-topic'}},other={...base,id:'other'};
 assert.deepEqual(selectLanguage([cn,en,other],'en').map(a=>a.id),['english','other']);
 assert.equal(translationOf(cn,[cn,en],'en').id,'english');
 assert.equal(translationOf(cn,[cn,en],'zh-TW'),undefined);
});
test('review reminders include due and manually outdated guides',()=>{
 assert.equal(reviewDue({...base,guide:{reviewDue:'2026-10-19'}},'2026-10-19'),true);
 assert.equal(reviewDue({...base,guide:{reviewDue:'2026-10-20'}},'2026-10-19'),false);
 assert.equal(reviewDue({...base,guide:{reviewState:'outdated'}},'2026-10-19'),true);
});
test('fixed FAQ answers are searchable while unpublished answers remain excluded',()=>{
 const guide={...base,guide:{faqs:[{q:'Which documents?',a:'passport verification'}]}};
 assert.match(searchable(guide),/passport/);
 assert.equal(retrieve('passport',[guide],'en')[0]?.id,guide.id);
 assert.equal(retrieve('passport',[{...guide,status:'draft'}],'en').length,0);
});
test('enquiries require explicit consent, valid contact and a supported language',()=>{
 const value={name:'Example',email:'example@example.com',message:'A sample question',language:'en',consent:true};
 assert.equal(inquirySchema.safeParse(value).success,true);
 for(const patch of [{consent:false},{email:'invalid'},{message:''},{language:'unknown'}])assert.equal(inquirySchema.safeParse({...value,...patch}).success,false);
});
