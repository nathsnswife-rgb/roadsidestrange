/**
 * Roadside Strange 16-letter hunt. Server-side, account-bound checking.
 * Cloudflare Worker with SQLite-backed Durable Object HUNT_LIMITER.
 * Required Worker variable: FIREBASE_PROJECT_ID.
 * Required secret: ANSWER_LETTERS (16 uppercase letters in clue order).
 *
 * Firebase ID token validation follows Firebase's documented checks:
 * RS256 signature, Google signing key, audience, issuer, times, subject.
 * Only verified-email accounts can submit guesses.
 */
const BASE_HEADERS={
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
};
const KEY_URL='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let signingKeys=null,keysExpires=0;
function json(data,status=200,origin=''){
  return new Response(JSON.stringify(data),{status,headers:{
    ...BASE_HEADERS,...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
  }});
}
function decodeBase64Url(str){
  if(!/^[A-Za-z0-9_-]+$/.test(str))throw Error('Invalid encoding');
  const base64=str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4);
  return Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
}
function decodeJson(str){
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(str)));
}
async function getSigningKeys(){
  if(signingKeys&&Date.now()<keysExpires)return signingKeys;
  const res=await fetch(KEY_URL,{headers:{Accept:'application/json'}});
  if(!res.ok)throw Error('Unable to read Firebase signing keys');
  const body=await res.json();
  if(!Array.isArray(body.keys)||body.keys.length<1)throw Error('Signing keys unavailable');
  const cacheControl=res.headers.get('Cache-Control')||'';
  const maxAge=Number(cacheControl.match(/max-age=(\d+)/)?.[1]||900);
  signingKeys=body.keys;
  keysExpires=Date.now()+Math.min(3600,Math.max(60,maxAge))*1000;
  return signingKeys;
}
async function firebaseUser(request,projectId){
  if(!/^[a-zA-Z0-9-]{4,100}$/.test(projectId||''))throw Error('Project not configured');
  const authorization=request.headers.get('Authorization')||'';
  const match=authorization.match(/^Bearer ([A-Za-z0-9_.-]+)$/);
  if(!match||match[1].length>8192)throw Error('Sign in required');
  const parts=match[1].split('.');
  if(parts.length!==3)throw Error('Invalid token');
  const header=decodeJson(parts[0]),claims=decodeJson(parts[1]);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>150)throw Error('Invalid token header');
  const now=Math.floor(Date.now()/1000);
  if(claims.aud!==projectId||claims.iss!=='https://securetoken.google.com/'+projectId||
    typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||
    !Number.isFinite(claims.exp)||claims.exp<=now||
    !Number.isFinite(claims.iat)||claims.iat>now||
    !Number.isFinite(claims.auth_time)||claims.auth_time>now||
    claims.email_verified!==true)throw Error('Verified email account required');
  const keys=await getSigningKeys();
  const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
  if(!jwk)throw Error('Signing key not found');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signedBytes=new TextEncoder().encode(parts[0]+'.'+parts[1]);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodeBase64Url(parts[2]),signedBytes);
  if(!ok)throw Error('Invalid token signature');
  return claims.sub; // verified Firebase UID, never client supplied
}
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    const allowed=(env.ALLOWED_ORIGIN||'https://roadsidestrange.com').split(',').map(x=>x.trim());
    const cors=origin&&allowed.includes(origin)?origin:'';
    if(request.method==='OPTIONS')return new Response(null,{status:cors?204:403,headers:cors?{
      'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'
    }:{}});
    if(origin&&!cors)return json({error:'Origin not allowed'},403);
    if(new URL(request.url).pathname!=='/check'||request.method!=='POST')
      return json({error:'Not found'},404,cors);
    if(!env.HUNT_LIMITER||!/^[A-Z]{16}$/.test(env.ANSWER_LETTERS||'')||!env.FIREBASE_PROJECT_ID)
      return json({error:'Checker not configured'},503,cors);
    const start=Date.parse(env.OPEN_AT||'2026-11-15T00:00:00-07:00');
    if(!Number.isFinite(start))return json({error:'Invalid opening time'},503,cors);
    if(Date.now()<start)return json({error:'Checker has not opened yet'},403,cors);
    const length=Number(request.headers.get('Content-Length')||'0');
    if(length>1024)return json({error:'Request too large'},413,cors);
    let uid;
    try{uid=await firebaseUser(request,env.FIREBASE_PROJECT_ID);}
    catch(error){
      return json({error:error.message==='Verified email account required'?'Verify your email before playing':'Sign in with a verified account'},401,cors);
    }
    let data;
    try{data=await request.json()}catch{return json({error:'Invalid JSON'},400,cors)}
    if(typeof data?.letters!=='string'||!/^[A-Z]{16}$/.test(data.letters))
      return json({error:'Enter exactly 16 letters'},400,cors);
    // Stable account identity; changing a VPN does not change the quota.
    const stub=env.HUNT_LIMITER.get(env.HUNT_LIMITER.idFromName('hunt-account-v1:'+uid));
    try{return json(await stub.checkSequence(data.letters,env.ANSWER_LETTERS),200,cors)}
    catch{return json({error:'Checker temporarily unavailable'},503,cors)}
  },
};
export class HuntLimiter{
  constructor(ctx,env){this.ctx=ctx;this.env=env}
  async checkSequence(letters,answer){
    if(!/^[A-Z]{16}$/.test(letters)||!/^[A-Z]{16}$/.test(answer))
      throw Error('Invalid checker inputs');
    const day=new Date().toISOString().slice(0,10);
    return this.ctx.storage.transaction(async tx=>{
      if(await tx.get('solved')===true)return {status:'correct',incorrect:0,remaining:0};
      const key='attempts:'+day,used=Number(await tx.get(key)||0);
      if(used>=3)return {status:'limit',remaining:0};
      await tx.put(key,used+1);
      const incorrect=[...answer].reduce((n,l,i)=>n+(letters[i]===l?0:1),0);
      if(incorrect===0){
        await tx.put('solved',true);
        return {status:'correct',incorrect:0,remaining:2-used};
      }
      return {status:'wrong',incorrect,remaining:2-used};
    });
  }
}
