import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {articleSchema} from '../lib/content.ts';

const root=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const originals=await read('lib/launch-articles.json');
const metadata=await read('content/translations/figures.json');
const translated=[];
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Wrap at word boundaries where available; allow CJK characters to wrap without spaces.
function wrap(text,max){
 const tokens=text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+\s*/gu)??[];
 const lines=[];let line='';
 const width=s=>[...s].reduce((sum,c)=>sum+(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(c)?1.7:1),0);
 for(const token of tokens){if(line&&width(line+token)>max){lines.push(line.trim());line='';}line+=token;}
 if(line)lines.push(line.trim());return lines;
}
function textBlock(text,x,y,size,max,color='#153d3a',weight=400){
 const lines=wrap(text,max);
 return {lines,svg:`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?size*1.35:0}">${escape(line)}</tspan>`).join('')}</text>`};
}
function diagram(data,lang){
 let content=textBlock(data.title,64,78,36,54,'#153d3a',700).svg;
 content+=textBlock(data.subtitle,64,145,20,96,'#55706c').svg;
 data.cards.forEach((card,i)=>{
  const x=64+i*362;
  content+=`<rect x="${x}" y="210" width="340" height="410" rx="22" fill="white" stroke="#d4dfd8"/><rect x="${x}" y="210" width="340" height="8" rx="4" fill="${i===2?'#70b84c':'#1c7169'}"/><text x="${x+24}" y="263" font-size="18" fill="#6e8c83">0${i+1}</text>`;
  let y=315;
  for(let n=0;n<card.length;n++){
   const size=n===0?27:n===1?25:21;
   const block=textBlock(card[n],x+24,y,size,n===0?20:n===1?22:26,n===0?'#153d3a':n===1?'#17665e':'#55706c',n===0?700:400);
   content+=block.svg;y+=block.lines.length*size*1.35+27;
  }
  if(y>635)throw Error(`Diagram overflow: ${lang} ${data.title}`);
 });
 content+=textBlock(data.footer,64,694,20,92,'#55706c').svg;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="780" viewBox="0 0 1200 780" lang="${lang}" role="img"><title>${escape(data.title)}</title><desc>${escape(data.subtitle+'; '+data.cards.map(c=>c.join(': ')).join('; ')+'. '+data.footer)}</desc><rect width="1200" height="780" fill="#f2f3ec"/><g font-family="Arial, Noto Sans, sans-serif">${content}<text x="64" y="752" font-size="17" fill="#55706c">HEX CUBES · APEC 2026</text></g></svg>\n`;
}
for(const [lang,meta] of Object.entries(metadata)){
 const edition=await read(`content/translations/${lang}.json`);
 if(edition.length!==originals.length)throw Error(`Incomplete edition: ${lang}`);
 for(const [index,source] of originals.entries()){
  const entry=edition[index],value=structuredClone(source);
  if(entry.body.split(/\n\n+/).length!==source.body.split(/\n\n+/).length)throw Error(`Paragraph count: ${lang} ${source.id}`);
  if(JSON.stringify(entry.body.match(/\[\d+\]/g))!==JSON.stringify(source.body.match(/\[\d+\]/g)))throw Error(`Citation order: ${lang} ${source.id}`);
  if(entry.captions.length!==value.guide.editorial.figures.length||entry.supports.length!==value.guide.editorial.sources.length)throw Error(`Missing metadata: ${lang} ${source.id}`);
  Object.assign(value,{id:`${source.id}-${lang}`,language:lang,title:entry.title,summary:entry.summary,body:entry.body,source:meta.edition,updatedAt:'2026-10-21T03:00:00.000Z'});
  Object.assign(value.guide,{groupId:source.id,notes:meta.notice,reviewedAt:'',reviewState:'pending'});
  value.guide.editorial.figures.forEach((figure,n)=>{
   figure.caption=entry.captions[n];figure.alt=entry.captions[n];
   if(!figure.aiGenerated){
    const name=index===0?'agenda':'navigation';
    figure.file=`/article-images/${source.id}-${lang}-diagram.svg`;
    figure.alt=meta[name].title;
   }
  });
  value.guide.editorial.sources.forEach((ref,n)=>ref.supports=entry.supports[n]);
  translated.push(articleSchema.parse(value));
  const diagramFigure=value.guide.editorial.figures.find(f=>!f.aiGenerated);
  if(diagramFigure)await writeFile(new URL(`public${diagramFigure.file}`,root),diagram(meta[index===0?'agenda':'navigation'],lang));
 }
}
await writeFile(new URL('lib/article-translations.json',root),JSON.stringify(translated,null,2)+'\n');
const snapshot=await read('github-pages/public-content.json');
// Only replace this edition's IDs; retain other published snapshot content.
const ids=new Set(translated.map(a=>a.id));
snapshot.articles=[...snapshot.articles.filter(a=>!ids.has(a.id)),...translated];
await writeFile(new URL('github-pages/public-content.json',root),JSON.stringify(snapshot,null,2)+'\n');
console.log(`Compiled ${translated.length} translations and 12 localized diagrams in ${fileURLToPath(root)}`);
