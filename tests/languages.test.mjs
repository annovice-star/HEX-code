import test from 'node:test';
import assert from 'node:assert/strict';
import {languageCodes,languageLabels,isLanguage,resolveLanguage} from '../lib/languages.ts';
import {guideCopy} from '../lib/guide-copy.ts';
import {guideUiCopy} from '../lib/guide-ui-copy.ts';
import {articleSchema,demos} from '../lib/content.ts';
import {inquirySchema} from '../lib/inquiries.ts';
import {selectLanguage,translationOf} from '../lib/guides.ts';

test('all eight languages have complete interface dictionaries and native labels',()=>{
 assert.deepEqual(languageCodes,['zh-CN','zh-HK','zh-TW','en','ja','ko','es','pt']);
 for(const lang of languageCodes){
  assert.ok(languageLabels[lang]);
  assert.deepEqual(Object.keys(guideCopy[lang]).sort(),Object.keys(guideCopy.en).sort());
  assert.deepEqual(Object.keys(guideUiCopy[lang]).sort(),Object.keys(guideUiCopy.en).sort());
  for(const value of [...Object.values(guideCopy[lang]),...Object.values(guideUiCopy[lang])]){
   if(Array.isArray(value))assert.ok(value.every(s=>s.trim()));else assert.ok(value.trim());
  }
 }
 for(const lang of ['zh-HK','zh-TW','ja','ko','es','pt']){
  assert.notEqual(guideCopy[lang].fallback,guideCopy.en.fallback);
  assert.notEqual(guideUiCopy[lang].previewNotice,guideUiCopy.en.previewNotice);
 }
});
test('new languages are accepted for articles and consented enquiries; invalid values stay rejected',()=>{
 for(const lang of languageCodes){
  assert.equal(articleSchema.safeParse({...demos[0],language:lang}).success,true);
  assert.equal(inquirySchema.safeParse({name:'Test',email:'test@example.com',message:'Test enquiry',language:lang,consent:true}).success,true);
 }
 for(const value of ['toString','constructor','__proto__','xx','',null]){
  assert.equal(isLanguage(value),false);assert.equal(resolveLanguage(value),'zh-CN');
  assert.equal(articleSchema.safeParse({...demos[0],language:value}).success,false);
 }
});
test('available translations are preferred and missing translations retain a single original article',()=>{
 const original={...demos[0],id:'original',guide:{groupId:'shared'}};
 for(const lang of ['ja','ko','es','pt']){
  const translated={...original,id:'translated-'+lang,language:lang};
  assert.equal(selectLanguage([original,translated],lang)[0].id,translated.id);
  assert.equal(translationOf(original,[original,translated],lang).id,translated.id);
  assert.deepEqual(selectLanguage([original],lang).map(a=>a.id),['original']);
  assert.equal(translationOf(original,[original],lang),undefined);
 }
});

test('Hong Kong and Taiwan editions select their own articles without relabelling a missing translation',()=>{
 const base={...demos[0],id:'cn',guide:{groupId:'regional'}};
 const hk={...base,id:'hk',language:'zh-HK'},tw={...base,id:'tw',language:'zh-TW'};
 for(const version of [hk,tw]){
  assert.equal(selectLanguage([base,hk,tw],version.language)[0].id,version.id);
  assert.equal(translationOf(base,[base,hk,tw],version.language).id,version.id);
 }
 assert.equal(translationOf(base,[base,tw],'zh-HK'),undefined);
 assert.equal(translationOf(base,[base,hk],'zh-TW'),undefined);
 assert.equal(selectLanguage([base,tw],'zh-HK')[0].language,'zh-CN');
});
