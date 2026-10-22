export type GatewayInput={path:string;method:"GET"|"POST";token?:string|null;body?:string};
const routes:Record<string,readonly string[]>={
  "/api/auth/login":["POST"],"/api/auth/logout":["POST"],"/api/auth/password":["POST"],
  "/api/content":["GET"],"/api/admin":["GET","POST"],"/api/search":["GET"],
  "/api/inquiries":["GET","POST"],"/api/chat":["POST"],
  "/api/admin/markdown-import":["POST"],"/api/admin/markdown-image":["GET"],
};
export function validateGatewayInput(value:unknown):GatewayInput{
  if(!value||typeof value!=="object")throw Error("invalid_request");
  const v=value as Record<string,unknown>;
  if(typeof v.path!=="string"||v.path.length>4096||!v.path.startsWith("/api/")||/[\\#\s]/.test(v.path))throw Error("invalid_path");
  const url=new URL(v.path,"https://gateway.invalid");
  if(url.origin!=="https://gateway.invalid"||url.pathname!==v.path.split("?")[0]||!Object.hasOwn(routes,url.pathname)||!routes[url.pathname].includes(v.method as string))throw Error("invalid_route");
  if(v.token!=null&&(typeof v.token!=="string"||!/^[0-9a-f]{64}$/.test(v.token)))throw Error("invalid_token");
  const maxBody=url.pathname==='/api/admin/markdown-import'?MAX_IMPORT_BYTES:url.pathname==='/api/admin'?1300000:80000;
  if(v.body!==undefined&&(typeof v.body!=="string"||v.body.length>maxBody||v.method!=="POST"))throw Error("invalid_body");
  return v as GatewayInput;
}
export async function readGatewayInput(request:Request){
  return validateGatewayInput(JSON.parse(await readLimitedText(request,MAX_IMPORT_BYTES)));
}
export async function readLimitedText(request:Request,max:number){
  const reader=request.body?.getReader();if(!reader)throw Error("invalid_body");
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error("too_large");}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
}
import {MAX_IMPORT_BYTES} from './markdown.ts';
