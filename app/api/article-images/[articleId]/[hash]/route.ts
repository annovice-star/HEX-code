import {readableImage} from '../../../../../lib/markdown-storage';
export async function GET(request:Request,{params}:{params:Promise<{articleId:string;hash:string}>}){
 const {articleId,hash}=await params;
 const object=await readableImage(`/api/article-images/${articleId}/${hash}`);
 if(!object)return new Response('Image not found',{status:404,headers:{'Cache-Control':'no-store'}});
 return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType??'application/octet-stream','Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
