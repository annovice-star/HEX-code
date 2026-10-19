import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {configurePages,apiFetch,navigate,siteHref} from "../lib/client-runtime";
import Hub from "../app/hub";
import Login from "../app/login/ui";
import Admin from "../app/admin/ui";
import AccountBar from "../app/account-bar";
import PasswordForm from "../app/admin/security/ui";
import {demos,type Article,type Contact} from "../lib/content";
import {guideSamples} from "../lib/guides";
import "../app/globals.css";

configurePages(import.meta.env.VITE_API_ORIGIN??"https://lifanghui-apec-hub.jazzymoon32.chatgpt.site",import.meta.env.BASE_URL);
type Data={articles:Article[];contact:Contact;aiEnabled:boolean;username:string};
function route(){return location.hash.startsWith("#/")?location.hash.slice(1):"/";}
function App(){
  const[path,setPath]=useState(route),[data,setData]=useState<Data|null>(null),[error,setError]=useState("");
  useEffect(()=>{const change=()=>setPath(route());addEventListener("hashchange",change);return()=>removeEventListener("hashchange",change);},[]);
  const url=new URL(path,"https://pages.local"),isLogin=url.pathname==="/login",admin=url.pathname.startsWith("/admin");
  useEffect(()=>{
    if(isLogin){setData(null);setError("");return;}
    const controller=new AbortController();setData(null);setError("");
    apiFetch(admin?"/api/admin":"/api/content",{signal:controller.signal}).then(async response=>{if(response.status===401)return;if(!response.ok)throw Error("加载失败，请稍后重试。");setData(await response.json() as Data);}).catch(e=>{if(e.name!=="AbortError")setError("暂时无法连接服务，请检查网络后重试。");});
    return()=>controller.abort();
  },[path,isLogin,admin]);
  useEffect(()=>{if(data&&!location.hash.startsWith("#/")){document.getElementById(location.hash.slice(1))?.scrollIntoView();}},[data]);
  if(isLogin)return <Login key={path} next={url.searchParams.get("next")??"/"} changed={url.searchParams.get("changed")==="1"}/>;
  if(error)return <main className="editor" style={{maxWidth:600,margin:"60px auto"}}><h1>暂时无法加载</h1><p role="alert">{error}</p><button className="button primary" onClick={()=>location.reload()}>重新加载</button> <a className="text-link" href={siteHref("/login")}>返回登录</a></main>;
  if(!data)return <main className="editor" style={{maxWidth:600,margin:"60px auto"}}><p role="status">正在验证登录并加载内容…</p></main>;
  if(admin)return <><AccountBar username={data.username}/>{url.pathname==="/admin/security"?<PasswordForm/>:<Admin key={path} initialArticles={data.articles} initialContact={data.contact} aiEnabled={data.aiEnabled}/>}</>;
  const id=url.pathname.startsWith("/article/")?decodeURIComponent(url.pathname.slice(9)):null;
  const article=id?[...data.articles,...demos,...guideSamples].find(a=>a.id===id):undefined;
  if(id&&!article)return <main className="editor"><h1>文章不存在或尚未发布</h1><a href={siteHref("/")}>返回首页</a></main>;
  if(url.pathname!=="/"&&!id){navigate("/");return null;}
  return <Hub key={path} articles={data.articles} contact={data.contact} aiEnabled={data.aiEnabled} initialArticle={article}/>;
}
createRoot(document.getElementById("root")!).render(<App/>);
