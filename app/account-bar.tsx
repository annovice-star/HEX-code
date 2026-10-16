"use client";
import { apiFetch,navigate,setClientToken,siteHref } from "../lib/client-runtime";
import { useState } from "react";
export default function AccountBar({username}:{username:string}){
  const[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function logout(){setBusy(true);try{const r=await apiFetch("/api/auth/logout",{method:"POST"});if(!r.ok)throw Error();setClientToken(null);navigate("/login");}catch{setError("退出失败，请重试。");setBusy(false);}}
  return <div className="account-bar"><span>已登录：{username}</span><a href={siteHref("/admin/security")}>修改密码</a><button disabled={busy} onClick={logout}>{busy?"正在退出…":"退出登录"}</button>{error&&<span role="alert">{error}</span>}</div>;
}
