export class ExportTimeoutError extends Error{
 stage:string;
 constructor(stage:string){super(`Article export timed out: ${stage}`);this.stage=stage;this.name='ExportTimeoutError';}
}
export function waitForExportStep<T>(work:PromiseLike<T>,stage:string,ms:number,signal?:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',aborted);};
  const aborted=()=>{cleanup();reject(new DOMException('Export cancelled','AbortError'));};
  if(signal?.aborted){void Promise.resolve(work).catch(()=>{});aborted();return;}
  timer=setTimeout(()=>{cleanup();reject(new ExportTimeoutError(stage));},ms);
  signal?.addEventListener('abort',aborted,{once:true});
  Promise.resolve(work).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
 });
}
export function compactExportDevice(){
 return /Android|iPhone|iPad|iPod|MicroMessenger/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/i.test(navigator.userAgent))||window.innerWidth<=768;
}
export function exportDimensions(height:number,compact:boolean){
 if(!Number.isFinite(height)||height<100||height>15000)throw Error('Article height unsupported');
 const width=Math.min(compact?720:1080,Math.floor(Math.sqrt((compact?2_500_000:14_000_000)*430/height)),Math.floor((compact?8000:30000)*430/height));
 if(width<320)throw Error('Article too long for this device');
 return {width,height:Math.ceil(height*width/430),scale:width/430};
}
export function waitForExportImage(image:HTMLImageElement,signal?:AbortSignal,ms=10000):Promise<void>{
 return new Promise((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>;
  const cleanup=()=>{clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);};
  const loaded=()=>{cleanup();image.naturalWidth?resolve():reject(Error('Article image unavailable'));};
  const failed=()=>{cleanup();reject(Error('Article image unavailable'));};
  const aborted=()=>{cleanup();reject(new DOMException('Export cancelled','AbortError'));};
  if(signal?.aborted){aborted();return;}
  if(image.complete){loaded();return;}
  timer=setTimeout(()=>{cleanup();reject(new ExportTimeoutError('image'));},ms);
  image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',aborted,{once:true});
 });
}

