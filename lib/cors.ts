import { env } from "cloudflare:workers";
export function pagesOrigin(request:Request){
  const configured=env.PAGES_ORIGIN;
  if(!configured||request.headers.get("origin")!==configured)return false;
  try{const url=new URL(configured);return url.origin===configured&&(url.protocol==="https:"||["127.0.0.1","localhost"].includes(url.hostname));}catch{return false;}
}
export function allowedWriteOrigin(request:Request){return request.headers.get("origin")===new URL(request.url).origin||pagesOrigin(request);}
export function corsHeaders(request:Request){
  const headers=new Headers({"Cache-Control":"private, no-store, max-age=0","Vary":"Origin"});
  if(pagesOrigin(request)){
    headers.set("Access-Control-Allow-Origin",request.headers.get("origin")!);
    headers.set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers","Authorization, Content-Type");
    headers.set("Access-Control-Max-Age","600");
  }
  return headers;
}
