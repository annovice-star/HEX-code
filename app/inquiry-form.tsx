"use client";
import {useState,type FormEvent} from "react";
import {apiFetch} from "../lib/client-runtime";
import {guideCopy} from "../lib/guide-copy";
import type {Article,Language} from "../lib/content";
export default function InquiryForm({article,lang}:{article?:Article;lang:Language}){
 const t=guideCopy[lang],[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const form=e.currentTarget,data=new FormData(form);setBusy(true);setError("");try{const r=await apiFetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({articleId:article?.id??"",name:data.get("name"),email:data.get("email"),message:data.get("message"),language:data.get("language"),consent:data.get("consent")==="on"})});if(!r.ok)throw Error();setDone(true);form.reset();}catch{setError(t.failed);}finally{setBusy(false);}}
 if(article?.demo)return <p className="notice">{t.noDemoConsult}</p>;
 return <form className="inquiry-form" onSubmit={submit}><p className="inquiry-topic">{article?.title??t.general}</p>{done&&<p role="status" className="success">{t.submitted}</p>}{error&&<p role="alert" className="error">{error}</p>}<div className="form-grid"><label className="field">{t.name}<input name="name" required maxLength={100} autoComplete="name"/></label><label className="field">{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email"/></label></div><label className="field">{t.language}<select name="language" defaultValue={lang} key={lang}><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option></select></label><label className="field">{t.message}<textarea name="message" rows={4} required minLength={3} maxLength={3000}/></label><label className="consent"><input name="consent" type="checkbox" required/>{t.consent}</label><button className="button primary" disabled={busy}>{busy?t.submitting:t.submit}</button></form>;
}
