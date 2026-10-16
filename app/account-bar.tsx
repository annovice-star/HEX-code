"use client";
import { useState } from "react";
export default function AccountBar({username}:{username:string}){
  const[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function logout(){setBusy(true);try{const r=await fetch("/api/auth/logout",{method:"POST"});if(!r.ok)throw Error();window.location.assign("/login");}catch{setError("退出失败，请重试。");setBusy(false);}}
  return <div className="account-bar"><span>已登录：{username}</span><a href="/admin/security">修改密码</a><button disabled={busy} onClick={logout}>{busy?"正在退出…":"退出登录"}</button>{error&&<span role="alert">{error}</span>}</div>;
}
