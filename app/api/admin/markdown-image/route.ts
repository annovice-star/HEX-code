import {requireApiAccess} from '../../../../lib/auth';
import {readableImage} from '../../../../lib/markdown-storage';
export async function GET(request:Request){
 const denied=await requireApiAccess(request,true);if(denied)return denied;
 const object=await readableImage(new URL(request.url).searchParams.get('path')??'',true);
 if(!object)return Response.json({error:'图片不存在。'},{status:404});
 const bytes=new Uint8Array(await object.arrayBuffer());let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return Response.json({data:`data:${object.httpMetadata?.contentType};base64,${btoa(binary)}`},{headers:{'Cache-Control':'private, no-store'}});
}
