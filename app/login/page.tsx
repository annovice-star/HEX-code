import { redirect } from "next/navigation";
import { session } from "../../lib/auth";
import { safeReturnTo } from "../../lib/password";
import Login from "./ui";
export const dynamic="force-dynamic";
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string;changed?:string}>}){
  const params=await searchParams,next=safeReturnTo(params.next);
  if(await session())redirect(next);
  return <Login next={next} changed={params.changed==="1"}/>;
}
