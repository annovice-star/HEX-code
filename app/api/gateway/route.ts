import {allowedWriteOrigin,corsHeaders} from "../../../lib/cors";
import {readGatewayInput} from "../../../lib/gateway";
import {POST as login} from "../auth/login/route";
import {POST as logout} from "../auth/logout/route";
import {POST as password} from "../auth/password/route";
import {GET as content} from "../content/route";
import {GET as admin,POST as save} from "../admin/route";
import {GET as search} from "../search/route";
import {GET as inquiries,POST as inquire} from "../inquiries/route";
import {POST as chat} from "../chat/route";
import {POST as markdownImport} from '../admin/markdown-import/route';
import {GET as markdownImage} from '../admin/markdown-image/route';
const handlers:Record<string,(request:Request)=>Promise<Response>>={
  "POST /api/auth/login":login,"POST /api/auth/logout":logout,"POST /api/auth/password":password,
  "GET /api/content":content,"GET /api/admin":admin,"POST /api/admin":save,
  "GET /api/search":search,"GET /api/inquiries":inquiries,"POST /api/inquiries":inquire,"POST /api/chat":chat,
  'POST /api/admin/markdown-import':markdownImport,'GET /api/admin/markdown-image':markdownImage,
};
export async function POST(request:Request){
  const headers=corsHeaders(request);
  if(!allowedWriteOrigin(request))return Response.json({error:"请求来源无效。"},{status:403,headers});
  let input;
  try{input=await readGatewayInput(request);}catch{return Response.json({error:"请求内容无效或过长。"},{status:400,headers});}
  const url=new URL(input.path,request.url),forwarded=new Headers({"Content-Type":"application/json","Origin":request.headers.get("origin")!});
  if(input.token)forwarded.set("Authorization",`Bearer ${input.token}`);
  // Only platform-provided IP is forwarded, preserving existing per-IP rate limits.
  const ip=request.headers.get("cf-connecting-ip");if(ip)forwarded.set("cf-connecting-ip",ip);
  const inner=new Request(url,{method:input.method,headers:forwarded,body:input.body});
  const response=await handlers[`${input.method} ${url.pathname}`](inner);
  const merged=new Headers(response.headers);headers.forEach((value,key)=>merged.set(key,value));
  return new Response(response.body,{status:response.status,headers:merged});
}
