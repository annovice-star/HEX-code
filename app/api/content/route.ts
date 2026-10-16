import { env } from "cloudflare:workers";
import { requireApiAccess,session } from "../../../lib/auth";
import { listArticles,contactSettings } from "../../../lib/server";
export async function GET(request:Request){
  const denied=await requireApiAccess(request,true);if(denied)return denied;
  const current=await session(request);
  const [articles,contact]=await Promise.all([listArticles(),contactSettings()]);
  return Response.json({articles,contact,aiEnabled:!!env.DEEPSEEK_API_KEY,username:current!.username},{headers:{"Cache-Control":"no-store"}});
}
