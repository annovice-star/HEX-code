import { requireApiAccess } from "../../../lib/auth";
import { listArticles,contactSettings } from "../../../lib/server";
export async function GET(request:Request){
  const denied=await requireApiAccess(request);if(denied)return denied;
  const [articles,contact]=await Promise.all([listArticles(),contactSettings()]);
  return Response.json({articles,contact,aiEnabled:false},{headers:{"Cache-Control":"no-store"}});
}
