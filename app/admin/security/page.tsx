import { requirePageAccess,session } from "../../../lib/auth";
import AccountBar from "../../account-bar";
import PasswordForm from "./ui";
export const dynamic="force-dynamic";
export default async function SecurityPage(){await requirePageAccess("/admin/security",true);const current=await session();return <><AccountBar username={current!.username}/><main className="admin-shell"><a className="text-link" href="/admin">← 返回管理后台</a><PasswordForm/></main></>;}
