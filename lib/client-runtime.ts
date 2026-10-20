type ClientRuntime={apiOrigin:string;assetBase:string};
let runtime:ClientRuntime|null=null;
let memoryToken:string|null|undefined;
const TOKEN_KEY="apec-pages-session";
export function configurePages(apiOrigin:string,assetBase="/"){runtime={apiOrigin,assetBase};}
export function assetHref(path:string){return `${runtime?.assetBase??"/"}${path.replace(/^\/+/,"")}`;}
export function isPages(){return runtime!==null;}
export function getClientToken(){
  if(memoryToken!==undefined)return memoryToken;
  try{return memoryToken=sessionStorage.getItem(TOKEN_KEY);}catch{return memoryToken=null;}
}
export function setClientToken(token:string|null){if(runtime){memoryToken=token;try{if(token)sessionStorage.setItem(TOKEN_KEY,token);else sessionStorage.removeItem(TOKEN_KEY);}catch{/* Embedded browsers may disable storage; keep this tab's session in memory. */}}}
export const connectionHelp="无法连接登录服务。请检查网络后重试；若在微信等应用内打开，请复制当前网址到 Safari 或 Chrome 再试。";
export function siteHref(path:string){return runtime?(path.startsWith("/#")?path.slice(1):`#${path}`):path;}
export function navigate(path:string){window.location.assign(siteHref(path));}
export async function apiFetch(path:string,options:RequestInit={},authenticated=true){
  if(!runtime)return fetch(path,options);
  if(options.body!=null&&typeof options.body!=="string")throw Error("不支持的请求内容。");
  // A safelisted POST avoids an extra cross-origin preflight in embedded browsers.
  // Credentials stay in the body, never in the URL; the gateway runs the original auth checks.
  const response=await fetch(runtime.apiOrigin+"/api/gateway",{
    method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},
    body:JSON.stringify({path,method:options.method??"GET",token:authenticated?getClientToken():null,body:options.body}),
    credentials:"omit",cache:"no-store",signal:options.signal,
  });
  if(authenticated&&response.status===401&&path!=="/api/auth/login"){setClientToken(null);navigate("/login");}
  return response;
}
