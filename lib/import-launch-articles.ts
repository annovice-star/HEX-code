import {eq} from "drizzle-orm";
import {getDb} from "../db";
import {articles,settings} from "../db/schema";
import {articleSchema} from "./content";
import launchBundle from "./launch-articles.json";

const marker="content-import:apec-2026-10-20-v2";
// Import this explicitly published edition once. Existing IDs, later edits and
// administrator deletions must never be overwritten or re-created on a deploy.
export async function importLaunchArticles(){
 const db=getDb();
 const [completed]=await db.select().from(settings).where(eq(settings.id,marker));
 if(completed)return;
 const values=launchBundle.map(value=>{const a=articleSchema.parse(value);return {...a,guide:a.guide??null,updatedAt:a.updatedAt??new Date().toISOString()};});
 await db.batch([
  db.insert(settings).values({id:marker,value:JSON.stringify({count:values.length,importedAt:new Date().toISOString()})}).onConflictDoNothing(),
  ...values.map(value=>db.insert(articles).values(value).onConflictDoNothing()),
 ]);
}
