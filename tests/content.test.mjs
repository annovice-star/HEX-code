import test from 'node:test';
import assert from 'node:assert/strict';
import { articleSchema, retrieve, demos } from '../lib/content.ts';
import {selectLanguage,translationOf,reviewDue,searchable} from '../lib/guides.ts';
import {inquirySchema} from '../lib/inquiries.ts';

const base = {...demos[0], id:'real-article',status:'published',demo:false,title:'企业落地与办公空间',summary:'团队落地前的准备',body:'企业可按团队规模梳理办公空间需求。'};
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
test('empty content and oversized bodies cannot be published',()=>{
  assert.equal(articleSchema.safeParse({...base,title:'   '}).success,false);
  assert.equal(articleSchema.safeParse({...base,body:'x'.repeat(30001)}).success,false);
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
