import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGatewayInput,readGatewayInput,readLimitedText} from '../lib/gateway.ts';
import {configurePages,apiFetch,setClientToken,getClientToken} from '../lib/client-runtime.ts';
test('gateway rejects arbitrary destinations, methods and malformed credentials',()=>{
  for(const path of ['https://evil.example/api/content','//evil.example/api/content','/api/gateway','/api/../api/admin','/api/search#x','/api/toString','/api/search\\x'])assert.throws(()=>validateGatewayInput({path,method:'GET'}));
  assert.throws(()=>validateGatewayInput({path:'/api/admin',method:'DELETE'}));
  assert.throws(()=>validateGatewayInput({path:'/api/content',method:'GET',token:'bad'}));
  assert.throws(()=>validateGatewayInput({path:'/api/content',method:'GET',body:'x'}));
  assert.throws(()=>validateGatewayInput({path:'/api/admin',method:'POST',body:'x'.repeat(1300001)}));
  assert.throws(()=>validateGatewayInput({path:'/api/auth/login',method:'POST',body:'x'.repeat(80001)}));
  assert.equal(validateGatewayInput({path:'/api/admin/markdown-import',method:'POST',body:'x'.repeat(900000)}).method,'POST');
  assert.equal(validateGatewayInput({path:'/api/search?q=test%20hello',method:'GET'}).path,'/api/search?q=test%20hello');
});
test('gateway bounds streamed input before parsing',async()=>{
  const req=new Request('https://backend.example/api/gateway',{method:'POST',body:'x'.repeat(512001)});
  await assert.rejects(readLimitedText(req,512000),/too_large/);
  await assert.rejects(readGatewayInput(new Request('https://backend.example/api/gateway',{method:'POST',body:'not json'})));
});
test('Pages transport avoids preflight headers and keeps token out of URL; blocked storage keeps tab session',async()=>{
  const originalFetch=globalThis.fetch,descriptor=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw new DOMException('Storage blocked','SecurityError');}});
  const calls=[];globalThis.fetch=async(...args)=>{calls.push(args);return Response.json({ok:true});};
  try{
    await apiFetch('/api/content');assert.equal(calls[0][0],'/api/content');
    configurePages('https://backend.example','/HEX-code/');const token='a'.repeat(64);setClientToken(token);assert.equal(getClientToken(),token);
    const controller=new AbortController();await apiFetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"test":true}',signal:controller.signal});
    const [url,options]=calls[1];assert.equal(url,'https://backend.example/api/gateway');assert.deepEqual(options.headers,{'Content-Type':'text/plain;charset=UTF-8'});
    assert.equal(options.signal,controller.signal);assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
    assert.deepEqual(JSON.parse(options.body),{path:'/api/auth/password',method:'POST',token,body:'{"test":true}'});
    globalThis.fetch=async(...args)=>{calls.push(args);return Response.json({error:'unavailable'},{status:401});};
    const publicResponse=await apiFetch('/api/content',{},false);assert.equal(publicResponse.status,401);assert.equal(JSON.parse(calls[2][1].body).token,null);assert.equal(getClientToken(),token);
    setClientToken(null);assert.equal(getClientToken(),null);
  }finally{globalThis.fetch=originalFetch;if(descriptor)Object.defineProperty(globalThis,'sessionStorage',descriptor);else delete globalThis.sessionStorage;}
});
