"use client";
import {Fragment} from "react";
import MarkdownContent from './markdown-content';
import {assetHref} from "../lib/client-runtime";
import {guideUiCopy} from "../lib/guide-ui-copy";
import type {Article,Language} from "../lib/content";

type Figure=NonNullable<NonNullable<Article["guide"]>["editorial"]>["figures"][number];
export function EditorialFigure({figure,thumbnail=false,lang="zh-CN"}:{figure:Figure;thumbnail?:boolean;lang?:Language}){
 return <figure className={thumbnail?"editorial-thumbnail":"editorial-figure"}>
  <div className="editorial-picture"><img src={assetHref(figure.file)} alt={figure.alt} loading="lazy" decoding="async"/>{figure.aiGenerated&&<span className="editorial-ai" lang={lang}>{guideUiCopy[lang].aiLabel}</span>}</div>
  {!thumbnail&&<figcaption>{figure.caption}</figcaption>}
 </figure>;
}
export default function EditorialContent({article,lang}:{article:Article;lang:Language}){
 const editorial=article.guide?.editorial;
 const ui=guideUiCopy[lang];
 const prefix=`references-${article.id}`;
 function text(value:string){return value.split(/(\[\d+\])/g).map((part,i)=>{
  const match=/^\[(\d+)\]$/.exec(part),number=match?Number(match[1]):0;
  return number&&editorial?.sources[number-1]?<a className="inline-citation" href={`#${prefix}-${number}`} onClick={event=>{event.preventDefault();document.getElementById(`${prefix}-${number}`)?.scrollIntoView({behavior:"smooth"});}} key={i} aria-label={`${ui.reference} ${number}`}>{part}</a>:part;
 });}
 return <>
  {editorial?.figures.filter(f=>f.afterParagraph===-1).map(f=><EditorialFigure key={f.file} figure={f} lang={lang}/>)}
  {article.guide?.format==='markdown'?<MarkdownContent body={article.body} id={article.id}/>:<div className="article-prose">{article.body.split(/\n\n+/).map((paragraph,i)=><Fragment key={i}>
   {paragraph.startsWith("## ")?<h2>{text(paragraph.slice(3))}</h2>:<p>{text(paragraph)}</p>}
   {editorial?.figures.filter(f=>f.afterParagraph===i).map(f=><EditorialFigure key={f.file} figure={f} lang={lang}/>)}
  </Fragment>)}</div>}
  {!!editorial?.sources.length&&<section className="editorial-references" lang={lang}><h2>{ui.references}</h2><p className="editorial-source-note">{ui.sourceNote.replace("{date}",editorial.preparedAt)}</p><ol>{editorial.sources.map((source,i)=><li lang={article.language} id={`${prefix}-${i+1}`} key={source.url}>
   <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><p>{source.publisher}{source.publishedAt&&` · ${source.publishedAt}`}</p><p>{source.supports}</p>
  </li>)}</ol></section>}
 </>;
}
