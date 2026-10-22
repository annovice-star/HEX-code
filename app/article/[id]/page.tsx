import { env } from "cloudflare:workers";
import { notFound } from "next/navigation";
import { listArticles, contactSettings } from "../../../lib/server";
import Hub from "../../hub";
import { requirePageAccess } from "../../../lib/auth";
export const dynamic="force-dynamic";
export default async function ArticlePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  await requirePageAccess(`/article/${id}`);
  const [articles,contact]=await Promise.all([listArticles(),contactSettings()]);
  const article=articles.find(a=>a.id===id);
  if(!article)notFound();
  return <Hub articles={articles} contact={contact} aiEnabled={false} initialArticle={article}/>;
}
