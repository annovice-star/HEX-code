import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {configurePages,apiFetch,navigate,siteHref,getClientToken,connectionHelp} from "../lib/client-runtime";
import Hub from "../app/hub";
import Login from "../app/login/ui";
import Admin from "../app/admin/ui";
import AccountBar from "../app/account-bar";
import PasswordForm from "../app/admin/security/ui";
import {publicContentSchema,type Article,type Contact} from "../lib/content";
import publicSnapshot from "./public-content.json";
import "../app/globals.css";

configurePages(import.meta.env.VITE_API_ORIGIN??"https://lifanghui-apec-hub.jazzymoon32.chatgpt.site",import.meta.env.BASE_URL);
type Data={articles:Article[];contact:Contact;aiEnabled:boolean;username:string};
const previewData:Data={...publicContentSchema.parse(publicSnapshot),username:""};
function route(){return location.hash.startsWith("#/")?location.hash.slice(1):"/";}
function App(){
  const[path,setPath]=useState(route),[data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[snapshot,setSnapshot]=useState(true);
  useEffect(()=>{const change=()=>setPath(route());addEventListener("hashchange",change);return()=>removeEventListener("hashchange",change);},[]);
  const url=new URL(path,"https://pages.local"),isLogin=url.pathname==="/login",admin=url.pathname.startsWith("/admin");
  useEffect(()=>{
    if(isLogin){setData(null);setError("");if(!url.searchParams.get("next")?.startsWith("/admin"))navigate("/");return;}
    if(admin&&!getClientToken()){navigate("/login?next="+encodeURIComponent(path));return;}
    const controller=new AbortController();let active=true;setData(admin?null:previewData);setSnapshot(true);setError("");
    const timeout=setTimeout(()=>controller.abort(),10000);
    apiFetch(admin?"/api/admin":"/api/content",{signal:controller.signal},admin).then(async response=>{
      if(!response.ok)throw Error("加载失败，请稍后重试。");
      const value=await response.json();
      if(active){setData(admin?value as Data:{...publicContentSchema.parse(value),username:""});setSnapshot(false);}
    }).catch(()=>{if(admin&&active)setError(connectionHelp);}).finally(()=>clearTimeout(timeout));
    return()=>{active=false;clearTimeout(timeout);controller.abort();};
  },[path,isLogin,admin]);
  useEffect(()=>{if(data&&!location.hash.startsWith("#/")){document.getElementById(location.hash.slice(1))?.scrollIntoView();}},[data]);
  if(isLogin)return <Login key={path} next={url.searchParams.get("next")??"/"} changed={url.searchParams.get("changed")==="1"}/>;
  if(error)return <main className="editor" style={{maxWidth:600,margin:"60px auto"}}><h1>暂时无法加载</h1><p role="alert">{error}</p><button className="button primary" onClick={()=>location.reload()}>重新加载</button> <a className="text-link" href={siteHref("/login")}>返回登录</a></main>;
  if(!data)return <main className="editor" style={{maxWidth:600,margin:"60px auto"}}><p role="status">{admin?"正在验证管理员登录…":"正在加载内容…"}</p></main>;
  if(admin)return <><AccountBar username={data.username}/>{url.pathname==="/admin/security"?<PasswordForm/>:<Admin key={path} initialArticles={data.articles} initialContact={data.contact} aiEnabled={data.aiEnabled}/>}</>;
  const id=url.pathname.startsWith("/article/")?decodeURIComponent(url.pathname.slice(9)):null;
  const article=id?data.articles.find(a=>a.id===id&&a.status==='published'&&!a.demo):undefined;
  if(id&&!article)return <main className="editor"><h1>文章不存在或尚未发布</h1><a href={siteHref("/")}>返回首页</a></main>;
  if(url.pathname!=="/"&&!id){navigate("/");return null;}
  return <><Hub previewNotice={snapshot} key={path} articles={data.articles} contact={data.contact} aiEnabled={data.aiEnabled} initialArticle={article}/></>;
}
createRoot(document.getElementById("root")!).render(<App/>);
