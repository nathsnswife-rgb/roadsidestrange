/**
 * Roadside Strange — final-answer email submission (Google Apps Script).
 * Standalone web app; deliberately NO spreadsheet, Firestore or other entry database.
 * Emails themselves remain in the sender's Sent mail and destination inbox.
 *
 * Deploy: execute as owner, access Anyone.
 * Set TEST_MODE=true for private tests, then false before prize launch.
 * Set OPEN_AT_UTC to desired opening time for final-answer submissions.
 */
const CONFIG = Object.freeze({
  DESTINATION: 'angel@roadsidestrange.com',
  TITLE: 'Roadside Strange Treasure Hunt',
  TEST_MODE: true,
  OPEN_AT_UTC: '2026-11-30T07:00:00Z', // Nov 30, midnight Arizona (MST)
  MAX_PER_DAY: 90, // email quota safety reserve; consumer Gmail often 100 recipients/day
});
function doGet() {
  return HtmlService.createHtmlOutputFromFile('EntryForm')
    .setTitle('Submit Your Final Answer | Roadside Strange');
}
function submitEntry(data) {
  const name = String(data && data.name || '').trim().replace(/[\r\n\t]/g,' ');
  const email = String(data && data.email || '').trim().toLowerCase();
  const answer = String(data && data.answer || '').trim().toUpperCase().replace(/\s+/g,' ');
  const confirmation = Boolean(data && data.consent);
  const trap = String(data && data.website || '').trim();
  const started = Number(data && data.startedAt || 0);
  if (trap) throw Error('Entry could not be accepted');
  if (!/^[\p{L}\p{M} .'-]{2,100}$/u.test(name)) throw Error('Enter your name (2–100 characters)');
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Enter a valid email address');
  if (!/^[A-Z]{4,40}$/.test(answer)) throw Error('Enter the final word, letters only');
  if (!confirmation) throw Error('Please confirm your submission');
  if (!Number.isFinite(started) || Date.now() - started < 2500 || Date.now() - started > 7200000) throw Error('Please reload the form and try again');
  if (!CONFIG.TEST_MODE && Date.now() < Date.parse(CONFIG.OPEN_AT_UTC)) {
    throw Error('Final-answer submissions have not opened yet');
  }

  // Light abuse control only: CacheService is best-effort and can evict keys.
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,email);
  const key = 'e_'+Utilities.base64EncodeWebSafe(digest).replace(/=+$/,'').slice(0,32);
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw Error('Submission service busy; please retry');
  try {
    if (cache.get(key)) throw Error('An entry from this email was received recently. Please try later');
    if (MailApp.getRemainingDailyQuota() < 1) throw Error('Entries are temporarily unavailable; please try again later');
    const id = Utilities.getUuid();
    const timestamp = new Date();
    const iso = timestamp.toISOString();
    const az = Utilities.formatDate(timestamp,'America/Phoenix','yyyy-MM-dd HH:mm:ss z');
    const label = CONFIG.TEST_MODE ? '[TEST ENTRY]' : '[FINAL ENTRY]';
    const subject = label+' Roadside Strange treasure hunt — '+id.slice(0,8);
    const body = [
      'Roadside Strange — Final Answer Submission',
      CONFIG.TEST_MODE ? 'TEST SUBMISSION — NOT A COMPETITION ENTRY' : 'COMPETITION ENTRY',
      '',
      'Submission ID: '+id,
      'Submitted (server UTC): '+iso,
      'Submitted (Arizona): '+az,
      'Name: '+name,
      'Email: '+email,
      'Final answer: '+answer,
      '',
      'This entry was submitted through the official web form.',
      'Sender identity is self-reported. Email delivery time may differ from submission time.'
    ].join('\n');
    MailApp.sendEmail({to:CONFIG.DESTINATION,subject,body,replyTo:email,name:'Roadside Strange Treasure Hunt'});
    cache.put(key,'1',600); // 10-minute per-email cooldown, not permanent storage
    return {ok:true,id,submittedAt:iso,testMode:CONFIG.TEST_MODE};
  } finally { lock.releaseLock(); }
}
