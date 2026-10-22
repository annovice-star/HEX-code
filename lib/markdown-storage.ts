import {env} from 'cloudflare:workers';
import {uploadedImagePattern} from './markdown';
export function imageKey(articleId:string,hash:string){return `markdown/${articleId}/${hash}`;}
export async function readableImage(path:string,admin=false){
 const match=uploadedImagePattern.exec(path);if(!match||!env.DB||!env.BUCKET)return null;
 const row=await env.DB.prepare('SELECT status,body FROM articles WHERE id=?').bind(match[1]).first<{status:string;body:string}>();
 if(!row||(!admin&&row.status!=='published')||!row.body.includes(path))return null;
 return env.BUCKET.get(imageKey(match[1],match[2]));
}
