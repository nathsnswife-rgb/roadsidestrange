/**
 * Cloudflare Worker backend for Roadside Strange's 16-clue letter checker.
 * Bind KV namespace ATTEMPTS. Set secrets ANSWER_LETTERS (16 uppercase letters in CLUE ORDER)
 * and IP_HASH_SECRET (random string). Set ALLOWED_ORIGIN=https://roadsidestrange.com
 * and OPEN_AT=2026-11-15T00:00:00-07:00 (adjust launch time as needed).
 * Never commit actual answers to GitHub or serve them to the browser.
 */
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(obj,status=200,origin='')=>new Response(JSON.stringify(obj),{status,headers:{...HEADERS,...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
async function ipKey(ip,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'';
 const allowed=(env.ALLOWED_ORIGIN||'https://roadsidestrange.com').split(',').map(s=>s.trim());
 const cors=origin&&allowed.includes(origin)?origin:'';
 if(request.method==='OPTIONS')return new Response(null,{status:cors?204:403,headers:{...(cors?{'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}:{})}});
 if(origin&&!cors)return json({error:'Origin not allowed'},403);
 if(new URL(request.url).pathname!=='/check'||request.method!=='POST')return json({error:'Not found'},404,cors);
 if(!env.ATTEMPTS||!/^[A-Z]{16}$/.test(env.ANSWER_LETTERS||'')||!env.IP_HASH_SECRET)return json({error:'Checker is not configured yet'},503,cors);
 const now=Date.now(),start=Date.parse(env.OPEN_AT||'2026-11-15T00:00:00-07:00');
 if(!Number.isFinite(start))return json({error:'Invalid launch configuration'},503,cors);
 if(now<start)return json({error:'The treasure hunt checker has not opened yet'},403,cors);
 const ip=request.headers.get('CF-Connecting-IP');if(!ip)return json({error:'Cannot verify attempt limit'},403,cors);
 if(Number(request.headers.get('Content-Length')||0)>2048)return json({error:'Request too large'},413,cors);
 let payload;try{payload=await request.json()}catch{return json({error:'Invalid JSON'},400,cors)}
 const entries=payload?.entries;
 if(!Array.isArray(entries)||entries.length<1||entries.length>16)return json({error:'Provide between 1 and 16 letters'},400,cors);
 const seen=new Set();
 for(const e of entries){if(!e||!Number.isInteger(e.clue)||e.clue<1||e.clue>16||typeof e.letter!=='string'||!/^[A-Z]$/.test(e.letter)||seen.has(e.clue))return json({error:'Invalid clue or letter'},400,cors);seen.add(e.clue)}
 const identity=await ipKey(ip,env.IP_HASH_SECRET),day=new Date(now).toISOString().slice(0,10);
 const results=[];
 for(const e of entries){
  const key='v1:'+day+':'+identity+':'+e.clue;
  const raw=await env.ATTEMPTS.get(key);const record=raw?JSON.parse(raw):{used:0,correct:false};
  if(record.correct){results.push({clue:e.clue,status:'correct',remaining:Math.max(0,3-record.used)});continue}
  if(record.used>=3){results.push({clue:e.clue,status:'limit',remaining:0});continue}
  const correct=e.letter===env.ANSWER_LETTERS[e.clue-1];
  record.used++;record.correct=correct;
  // A UTC-day counter with 48h TTL. KV is eventually consistent: this is a
  // basic deterrent, not an atomic, tamper-proof competition-grade limiter.
  await env.ATTEMPTS.put(key,JSON.stringify(record),{expirationTtl:172800});
  results.push({clue:e.clue,status:correct?'correct':'wrong',remaining:3-record.used});
 }
 return json({results,reset:'00:00 UTC'},200,cors);
}};
