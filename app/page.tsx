import { env } from "cloudflare:workers";
import { listArticles, contactSettings } from "../lib/server";
import Hub from "./hub";
import { requirePageAccess } from "../lib/auth";
export const dynamic = "force-dynamic";
export default async function Home(){
  await requirePageAccess("/");
  const [articles,contact]=await Promise.all([listArticles(),contactSettings()]);
  return <Hub articles={articles} contact={contact} aiEnabled={false}/>;
}
