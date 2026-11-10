/**
 * Roadside Strange private all-or-nothing 16-letter checker.
 * Cloudflare Durable Object binding HUNT_LIMITER.
 * Secrets: ANSWER_LETTERS (16 uppercase characters in clue order), IP_HASH_SECRET.
 * Never store or return the answer in public code.
 */
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(obj,status=200,origin=''){return new Response(JSON.stringify(obj),{status,headers:{...HEADERS,...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}})}
async function anonymousId(ip,secret){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGIN||'https://roadsidestrange.com').split(',').map(x=>x.trim());
  const cors=origin&&allowed.includes(origin)?origin:'';
  if(request.method==='OPTIONS')return new Response(null,{status:cors?204:403,headers:cors?{'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}:{}});
  if(origin&&!cors)return reply({error:'Origin not allowed'},403);
  if(new URL(request.url).pathname!=='/check'||request.method!=='POST')return reply({error:'Not found'},404,cors);
  if(!env.HUNT_LIMITER||!/^[A-Z]{16}$/.test(env.ANSWER_LETTERS||'')||!env.IP_HASH_SECRET)return reply({error:'Checker not configured'},503,cors);
  const start=Date.parse(env.OPEN_AT||'2026-11-15T00:00:00-07:00');
  if(!Number.isFinite(start))return reply({error:'Invalid opening time'},503,cors);
  if(Date.now()<start)return reply({error:'Checker is not open yet'},403,cors);
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip)return reply({error:'Attempt identity unavailable'},403,cors);
  if(Number(request.headers.get('Content-Length')||0)>512)return reply({error:'Request too large'},413,cors);
  let body;try{body=await request.json()}catch{return reply({error:'Invalid JSON'},400,cors)}
  if(typeof body?.letters!=='string'||!/^[A-Z]{16}$/.test(body.letters))return reply({error:'Enter exactly 16 letters'},400,cors);
  const id=env.HUNT_LIMITER.idFromName('hunt-whole-v1:'+await anonymousId(ip,env.IP_HASH_SECRET));
  try{
   const result=await env.HUNT_LIMITER.get(id).checkSequence(body.letters,env.ANSWER_LETTERS);
   return reply(result,200,cors);
  }catch{return reply({error:'Unable to check now'},503,cors)}
 }
};
export class HuntLimiter{
 constructor(ctx,env){this.ctx=ctx;this.env=env}
 async checkSequence(letters,answer){
  if(!/^[A-Z]{16}$/.test(letters)||!/^[A-Z]{16}$/.test(answer))throw Error('Invalid validation inputs');
  const date=new Date().toISOString().slice(0,10);
  return this.ctx.storage.transaction(async tx=>{
   if(await tx.get('solved')===true)return {status:'correct',remaining:0};
   const key='attempts:'+date;
   const used=Number(await tx.get(key)||0);
   if(used>=3)return {status:'limit',remaining:0};
   const remaining=2-used;
   await tx.put(key,used+1);
   if(letters===answer){await tx.put('solved',true);return {status:'correct',remaining}}
   return {status:'wrong',remaining};
  });
 }
}
