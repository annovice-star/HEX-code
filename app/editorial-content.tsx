"use client";
import {Fragment} from "react";
import {assetHref} from "../lib/client-runtime";
import type {Article} from "../lib/content";

type Figure=NonNullable<NonNullable<Article["guide"]>["editorial"]>["figures"][number];
export function EditorialFigure({figure,thumbnail=false}:{figure:Figure;thumbnail?:boolean}){
 return <figure className={thumbnail?"editorial-thumbnail":"editorial-figure"}>
  <div className="editorial-picture"><img src={assetHref(figure.file)} alt={figure.alt} loading="lazy" decoding="async"/>{figure.aiGenerated&&<span className="editorial-ai">AI生成 · 概念示意</span>}</div>
  {!thumbnail&&<figcaption>{figure.caption}</figcaption>}
 </figure>;
}
export default function EditorialContent({article}:{article:Article}){
 const editorial=article.guide?.editorial;
 const prefix=`references-${article.id}`;
 function text(value:string){return value.split(/(\[\d+\])/g).map((part,i)=>{
  const match=/^\[(\d+)\]$/.exec(part),number=match?Number(match[1]):0;
  return number&&editorial?.sources[number-1]?<a className="inline-citation" href={`#${prefix}-${number}`} onClick={event=>{event.preventDefault();document.getElementById(`${prefix}-${number}`)?.scrollIntoView({behavior:"smooth"});}} key={i} aria-label={`参考来源 ${number}`}>{part}</a>:part;
 });}
 return <>
  {editorial?.figures.filter(f=>f.afterParagraph===-1).map(f=><EditorialFigure key={f.file} figure={f}/>)}
  <div className="article-prose">{article.body.split(/\n\n+/).map((paragraph,i)=><Fragment key={i}>
   {paragraph.startsWith("## ")?<h2>{text(paragraph.slice(3))}</h2>:<p>{text(paragraph)}</p>}
   {editorial?.figures.filter(f=>f.afterParagraph===i).map(f=><EditorialFigure key={f.file} figure={f}/>)}
  </Fragment>)}</div>
  {!!editorial?.sources.length&&<section className="editorial-references"><h2>参考来源</h2><p className="editorial-source-note">综合整理于 {editorial.preparedAt}。正文编号对应下列原文；“专题观察”为编辑分析。</p><ol>{editorial.sources.map((source,i)=><li id={`${prefix}-${i+1}`} key={source.url}>
   <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><p>{source.publisher}{source.publishedAt&&` · ${source.publishedAt}`}</p><p>{source.supports}</p>
  </li>)}</ol></section>}
 </>;
}
