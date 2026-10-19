"use client";
import {useEffect,useState} from "react";
import {apiFetch} from "../../lib/client-runtime";
import type {Inquiry} from "../../lib/inquiries";
const labels={pending:"待处理",contacted:"已联系",completed:"已完成"};
export default function Inquiries(){
 const [rows,setRows]=useState<Inquiry[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState("");
 useEffect(()=>{const abort=new AbortController();apiFetch("/api/inquiries",{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error();setRows(((await r.json()) as {inquiries:Inquiry[]}).inquiries);}).catch(e=>{if(e.name!=="AbortError")setError("咨询记录加载失败，请刷新重试。");}).finally(()=>setLoading(false));return()=>abort.abort();},[]);
 async function change(id:string,status:string){setBusy(id);setError("");try{const r=await apiFetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"status",id,status})});if(!r.ok)throw Error();setRows(list=>list.map(row=>row.id===id?{...row,status}:row));}catch{setError("状态保存失败，请重试。");}finally{setBusy("");}}
 return <section className="editor"><h2>客户咨询 · {rows.length}</h2><p className="editor-note">仅管理员可查看。提交表单会保存记录，不会自动发送邮件通知，请定期查看。</p>{loading&&<p role="status">正在加载…</p>}{error&&<p className="error" role="alert">{error}</p>}{!loading&&!rows.length&&<p>暂无咨询记录。</p>}<div className="inquiry-list">{rows.map(row=><article className="inquiry-record" key={row.id}><div className="section-head"><div><strong>{row.topic}</strong><p>{new Date(row.createdAt).toLocaleString("zh-CN")} · {row.language}</p></div><label className="field">处理状态<select value={row.status} disabled={busy===row.id} onChange={e=>change(row.id,e.target.value)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div><p>{row.name} · <a className="text-link" href={`mailto:${row.email}`}>{row.email}</a></p><p className="inquiry-message">{row.message}</p></article>)}</div></section>;
}
