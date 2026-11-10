# Roadside Strange — final-answer email form (Google Apps Script)

## Current state
- **Prepared but not deployed.** The source is here in `treasure-hunt-email/Code.gs` and `treasure-hunt-email/EntryForm.html`.
- The hidden website preview shows the matching final-answer form as a **visual demo only**. Its submit button does **not send or store any names/emails/answers**.
- The live script will email `angel@roadsidestrange.com` using **MailApp under the Google account that deploys it**, with an entry ID and server-generated UTC/Arizona timestamp.
- No separate submission database. Entries are still retained in the recipient inbox and the sending account's Sent mail.
- The submission form **does not test whether the final word is correct**. Winner selection remains organizer review.

## Publish the real Google-hosted form
1. Go to https://script.google.com/home/projects/create while signed into the Google account you want to send the entries.
2. Name the script `Roadside Strange — Treasure Hunt Entries`.
3. Paste `Code.gs` into the Apps Script `Code.gs` file.
4. Add a new **HTML** file named `EntryForm` (Apps Script adds .html automatically) and paste `EntryForm.html`.
5. Leave `CONFIG.TEST_MODE: true` initially. It labels sent email **TEST ENTRY**. Set it to `false` before launch.
6. Verify the desired opening date. The current default is **2026-11-30 00:00 Arizona time** (= `2026-11-30T07:00:00Z`) when the final clue is released.
7. Select **Deploy > New deployment > Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the MailApp permission from the owning Google account. Deploy and copy the `/exec` URL.
8. Test one submission from a non-owner browser session. Confirm it arrives at the destination email and contains submitted name/email/answer, server UTC + Arizona timestamps, and unique entry ID. Confirm no mail is sent when fields are incomplete.
9. For launch, switch `TEST_MODE` to `false`, redeploy a **new version of the existing deployment** and repeat a controlled test. Do not publish the public entry link until the correct opening date.
10. Add a `Submit Final Answer` link from `roadsidestrange.com` to the Apps Script URL. The Apps Script-hosted page carries Roadside Strange's dark-purple visual design. A hosted page is used instead of embedding an iframe because cross-origin iframe support can be inconsistent.

## Limits and important considerations
- Google Apps Script MailApp uses the deploying account's email quota (consumer accounts commonly **100 recipients per 24 hours**, Workspace more). If the limit is exhausted, submissions may fail; your Resend quota does not increase Google's MailApp quota. Use the already-connected Resend separately only if the contest demands higher throughput.
- The code validates and normalizes fields, has a honeypot and a **best-effort** 10-minute per-email cooldown using CacheService. These are not strong anti-abuse controls: bots can submit fake emails and names, or vary them. Email details aren't verified.
- Server timestamps are authoritative for each processed submission but **email arrival order is not guaranteed**. For a $100 first-correct-entry prize, inbox delivery timing is not an audit-grade winner ordering mechanism; define winner rules accordingly.
- A publicly accessible Apps Script endpoint can be spammed and exhaust email quota. It is not suitable for a high-stakes, high-volume contest without stronger protection and a durable audit trail.
- No user information is stored in a website database, but it exists in transmitted email and the inbox/Sent folders. Publish a privacy explanation and retention timeframe.
- **Never put Resend API keys, Gmail passwords, or the true checker answer in publicly served HTML or this repository.**

## Files
- `Code.gs`: Apps Script server, validation, MailApp notification
- `EntryForm.html`: Google-hosted final-answer form with matching purple theme
