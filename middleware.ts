import { NextResponse } from "next/server";

// Authenticated HTML and API responses must never enter a shared cache.
export function middleware(){
  const response=NextResponse.next();
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  return response;
}
export const config={matcher:["/((?!_next/static|assets|favicon.ico).*)"]};
