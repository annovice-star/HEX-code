import { env } from "cloudflare:workers";
import { listArticles, contactSettings } from "../../lib/server";
import { requirePageAccess,session } from "../../lib/auth";
import AccountBar from "../account-bar";
import Admin from "./ui";
export const dynamic="force-dynamic";
export default async function AdminPage(){
  await requirePageAccess("/admin",true);
  const current=await session();
  const [articles,contact]=await Promise.all([listArticles(false),contactSettings()]);
  return <><AccountBar username={current!.username}/><Admin initialArticles={articles} initialContact={contact} aiEnabled={false}/></>;
}
