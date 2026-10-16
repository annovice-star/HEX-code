import { listArticles } from "../../../lib/server";
import { retrieve, type Language } from "../../../lib/content";
import { requireApiAccess } from "../../../lib/auth";
export async function GET(request: Request) {
  const denied=await requireApiAccess(request);if(denied)return denied;
  const params = new URL(request.url).searchParams, q = (params.get("q") ?? "").slice(0,1000);
  const lang = (["zh-CN","zh-TW","en"].includes(params.get("lang")??"")?params.get("lang"):"zh-CN") as Language;
  const hits=retrieve(q,await listArticles(),lang);
  return Response.json({sources:hits.map(a=>({id:a.id,title:a.title,summary:a.summary,source:a.source,date:a.date}))});
}
