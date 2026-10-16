type ClientRuntime={apiOrigin:string};
let runtime:ClientRuntime|null=null;
const TOKEN_KEY="apec-pages-session";
export function configurePages(apiOrigin:string){runtime={apiOrigin};}
export function isPages(){return runtime!==null;}
export function setClientToken(token:string|null){if(runtime){if(token)sessionStorage.setItem(TOKEN_KEY,token);else sessionStorage.removeItem(TOKEN_KEY);}}
export function siteHref(path:string){return runtime?(path.startsWith("/#")?path.slice(1):`#${path}`):path;}
export function navigate(path:string){window.location.assign(siteHref(path));}
export async function apiFetch(path:string,options:RequestInit={}){
  if(!runtime)return fetch(path,options);
  const headers=new Headers(options.headers),token=sessionStorage.getItem(TOKEN_KEY);
  if(token)headers.set("Authorization",`Bearer ${token}`);
  const response=await fetch(runtime.apiOrigin+path,{...options,headers,credentials:"omit",cache:"no-store"});
  if(response.status===401&&path!=="/api/auth/login"){setClientToken(null);navigate("/login");}
  return response;
}
