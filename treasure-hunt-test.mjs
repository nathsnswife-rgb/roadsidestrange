import assert from 'node:assert/strict';
import { HuntLimiter } from './treasure-hunt-worker.js';

const answer='COUNTERTERRORISM';
assert.equal(answer.length,16);
function player(){
  const store=new Map();
  return new HuntLimiter({
    storage:{
      transaction: async fn=>fn({
        get: async key=>store.get(key),
        put: async (key,value)=>{store.set(key,value)}
      })
    }
  },{});
}
const p=player();
const r1=await p.checkSequence('XXXXXXXXXXXXXXXX',answer);
assert.equal(r1.status,'wrong');
assert.equal(r1.incorrect,16);
assert.equal(r1.remaining,2);
const near='COUNTERTERRORISX';
const r2=await p.checkSequence(near,answer);
assert.deepEqual([r2.status,r2.incorrect,r2.remaining],['wrong',1,1]);
const r3=await p.checkSequence('AAAAAAAAAAAAAAAA',answer);
assert.equal(r3.remaining,0);
assert.equal((await p.checkSequence(answer,answer)).status,'limit');
const other=player();
const solved=await other.checkSequence(answer,answer);
assert.deepEqual([solved.status,solved.incorrect,solved.remaining],['correct',0,2]);
assert.equal((await other.checkSequence('XXXXXXXXXXXXXXXX',answer)).status,'correct');
console.log('PASS: incorrect counts, 3-guess lockout, separate player state, persisted success');
