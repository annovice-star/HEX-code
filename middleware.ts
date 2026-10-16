import { NextResponse } from "next/server";
import { corsHeaders,pagesOrigin } from "./lib/cors";

// Authenticated HTML and API responses must never enter a shared cache.
export function middleware(request:Request){
  if(new URL(request.url).pathname.startsWith("/api/")&&request.method==="OPTIONS")return new Response(null,{status:pagesOrigin(request)?204:403,headers:corsHeaders(request)});
  const response=NextResponse.next();
  corsHeaders(request).forEach((value,key)=>response.headers.set(key,value));
  return response;
}
export const config={matcher:["/((?!_next/static|assets|favicon.ico).*)"]};
