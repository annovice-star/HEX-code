import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, sha256, randomHex, equalHash, safeReturnTo } from "./password";

export const SESSION_SECONDS=8*60*60;
export type Account={username:string;password_hash:string;salt:string;version:number};
export type Session={username:string;version:number;tokenHash:string};
const db=()=>{if(!env.DB)throw Error("Storage unavailable");return env.DB;};
export function isPublic(){return env.SITE_VISIBILITY==="public";}
function rawCookie(header:string|null){return header?.split(";").map(v=>v.trim()).find(v=>v.startsWith("apec_session="))?.slice("apec_session=".length)??"";}
export async function session(request?:Request):Promise<Session|null>{
  const h=request?.headers??await headers(), token=rawCookie(h.get("cookie"));
  if(!/^[a-f0-9]{64}$/.test(token))return null;
  const tokenHash=await sha256(token);
  const row=await db().prepare("SELECT s.username,s.version FROM admin_sessions s JOIN admin_accounts a ON s.username=a.username AND s.version=a.version WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash,Date.now()).first<{username:string;version:number}>();
  return row?{...row,tokenHash}:null;
}
export async function requirePageAccess(returnTo:string,admin=false){
  if(!admin&&isPublic())return;
  if(!await session())redirect(`/login?next=${encodeURIComponent(safeReturnTo(returnTo))}`);
}
export async function requireApiAccess(request:Request,admin=false){
  if(!admin&&isPublic())return null;
  return await session(request)?null:Response.json({error:"请先使用管理员账号登录。"},{status:401,headers:{"Cache-Control":"no-store"}});
}
export function sameOrigin(request:Request){return request.headers.get("origin")===new URL(request.url).origin;}
export async function ensureAdmin(){
  const username=env.ADMIN_BOOTSTRAP_USERNAME,salt=env.ADMIN_BOOTSTRAP_SALT,hash=env.ADMIN_BOOTSTRAP_HASH;
  if(!username||!salt||!hash)return;
  if(!/^[a-f0-9]{64}$/.test(hash)||! /^[a-f0-9]{32}$/.test(salt))throw Error("Invalid bootstrap config");
  await db().prepare("INSERT INTO admin_accounts (username,password_hash,salt,version) VALUES (?,?,?,1) ON CONFLICT(username) DO NOTHING").bind(username,hash,salt).run();
}
export async function findAccount(username:string){return db().prepare("SELECT username,password_hash,salt,version FROM admin_accounts WHERE username=?").bind(username).first<Account>();}
export async function verifyPassword(account:Account|null,password:string){
  // Unknown users still pay the password-hashing cost; do not reveal account existence.
  const actual=await hashPassword(password,account?.salt??"00000000000000000000000000000000");
  return !!account&&equalHash(actual,account.password_hash);
}
export async function createSession(account:Account,request:Request){
  const token=randomHex(),tokenHash=await sha256(token),expires=Date.now()+SESSION_SECONDS*1000;
  await db().prepare("DELETE FROM admin_sessions WHERE expires_at<=?").bind(Date.now()).run();
  await db().prepare("INSERT INTO admin_sessions (token_hash,username,version,expires_at) SELECT ?,username,version,? FROM admin_accounts WHERE username=? AND version=?").bind(tokenHash,expires,account.username,account.version).run();
  return cookie(token,request,SESSION_SECONDS);
}
export function cookie(token:string,request:Request,age:number){return `apec_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==="https:"?"; Secure":""}`;}
export async function removeSession(request:Request){const current=await session(request);if(current)await db().prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(current.tokenHash).run();}
export async function changePassword(account:Account,password:string){
  const salt=randomHex(16),hash=await hashPassword(password,salt);
  const result=await db().prepare("UPDATE admin_accounts SET password_hash=?,salt=?,version=version+1 WHERE username=? AND version=?").bind(hash,salt,account.username,account.version).run();
  if(!result.meta.changes)throw Error("Account changed; sign in again");
  // Version comparison invalidates old sessions atomically, including a concurrent login.
  await db().prepare("DELETE FROM admin_sessions WHERE username=? AND version<=?").bind(account.username,account.version).run();
}
export async function authRateLimit(request:Request,kind:string){
  const now=Date.now(),period=15*60000,window=Math.floor(now/period),ip=request.headers.get("cf-connecting-ip")??"local";
  const key=`auth:${kind}:${window}:${await sha256(ip+String(window))}`;
  const row=await db().prepare("INSERT INTO rate_limits (id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count").bind(key,now+period).first<{count:number}>();
  await db().prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(now).run();
  return (row?.count??999)<=15;
}
