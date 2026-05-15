# Codex Deploy Plan — The Blondes Concept

**Project:** React 19 + Vite + TypeScript + Tailwind 4 + Firebase 12 e-commerce
**Firebase project:** `sito-web-28a07` | **Region:** `europe-west1`
**Frontend:** `https://theblondesconcept.netlify.app`
**Root:** `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\Jade\Jade-main\Jade-main`
**Functions root:** `<root>\functions`

All paths below use forward slashes. When running shell commands, `cd` to the root first unless told otherwise.

---

## 1. Prerequisites check

Verify that every CLI tool is present and authenticated before touching any code.

```bash
node --version          # Must be >= 20
npm --version
firebase --version      # Must be >= 13 (CLI v2 functions support)
stripe --version        # Stripe CLI — needed for Step 10
netlify --version       # Netlify CLI — needed for Step 13
```

```bash
firebase projects:list
```

Expected: `sito-web-28a07` appears in the list and is marked as the active project. If not:

```bash
firebase use sito-web-28a07
```

```bash
netlify status
```

Expected: shows a logged-in user. If not: `netlify login`.

```bash
stripe login
```

Follow the browser prompt to authenticate the Stripe CLI.

**Check:** confirm `functions/node_modules` exists. If not, run `npm install` inside `functions/`.

---

## 2. CORS domain replacement in function files

Replace old domain references in CORS arrays across all function files.

**Rule:** replace `'https://blondejade.netlify.app'` and `'https://theblondes.it'` with `'https://theblondesconcept.netlify.app'` in CORS arrays only. Do NOT touch email `from:` fields, `HTTP-Referer` headers, or HTML email templates.

**Files to edit (all under `functions/src/`):**

| File | Location |
|---|---|
| `orders/createCheckoutSession.ts` | `CORS_ORIGINS` constant |
| `orders/bankTransfer.ts` | `CORS_ORIGINS` constant |
| `orders/cryptoPayment.ts` | `CORS_ORIGINS` constant |
| `orders/adminActions.ts` | `CORS_ORIGINS` constant |
| `index.ts` | `cors:` array inside `vtoTryon` options object |

Each CORS array currently reads:

```ts
const CORS_ORIGINS: (string | RegExp)[] = [
  'https://blondejade.netlify.app',
  'https://theblondes.it',
  /localhost(:\d+)?$/,
];
```

It must become:

```ts
const CORS_ORIGINS: (string | RegExp)[] = [
  'https://theblondesconcept.netlify.app',
  /localhost(:\d+)?$/,
];
```

The `vtoTryon` function in `index.ts` uses an inline array literal rather than a constant — apply the same pattern there.

**Verify after editing:**

```bash
grep -rn "blondejade.netlify.app" functions/src/
```

Expected: zero matches.

```bash
grep -rn "theblondes.it" functions/src/
```

Expected: matches only in `from:` email fields, `HTTP-Referer` headers, and HTML template strings — never inside a `cors:` array.

---

## 3. Create `functions/.env.sito-web-28a07`

Firebase Functions v2 `defineString` params are resolved from a `.env.<projectId>` file in the `functions/` directory.

Create `functions/.env.sito-web-28a07`:

```
SITE_URL=https://theblondesconcept.netlify.app
NOWPAYMENTS_IPN_URL=https://europe-west1-sito-web-28a07.cloudfunctions.net/nowPaymentsWebhook
```

The `NOWPAYMENTS_IPN_URL` value above is the standard Cloud Functions v2 URL pattern. It will be confirmed against the real deployed URL in Step 8.

---

## 4. Collect secrets and set them via Firebase CLI

⚠️ **STOP — human input required.**

Ask the user to supply the following values. Do not proceed until all are provided.

**Secrets to request:**

1. `STRIPE_SECRET` — Stripe secret key (`sk_live_...` or `sk_test_...`) from Stripe Dashboard > Developers > API keys
2. `STRIPE_WEBHOOK_SECRET` — skip for now; obtained in Step 10
3. `RESEND_API_KEY` — from resend.com dashboard > API keys
4. `TELEGRAM_BOT_TOKEN` — from @BotFather on Telegram
5. `TELEGRAM_CHAT_ID` — numeric ID of the Telegram chat/channel for order alerts
6. `NOWPAYMENTS_API_KEY` — from NOWPayments dashboard
7. `NOWPAYMENTS_IPN_SECRET` — from NOWPayments dashboard > IPN settings
8. `OPENROUTER_API_KEY` — check first: `firebase functions:secrets:access OPENROUTER_API_KEY`. If it returns a value, skip. If it returns an error, request from user.

For each secret:

```bash
firebase functions:secrets:set STRIPE_SECRET
# CLI prompts for value (not echoed)

firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set NOWPAYMENTS_API_KEY
firebase functions:secrets:set NOWPAYMENTS_IPN_SECRET
```

**Verify:**

```bash
firebase functions:secrets:list
```

Expected: all 6 secrets above appear (excluding `STRIPE_WEBHOOK_SECRET` which is done in Step 10).

---

## 5. TypeScript compilation check

**Functions:**

```bash
cd functions && npx tsc --noEmit && cd ..
```

Expected: exits code 0, no output.

**Frontend (root):**

```bash
npx tsc --noEmit
```

Expected: exits code 0. Fix any errors before proceeding — do not deploy with TS errors.

---

## 6. Deploy Firestore rules and indexes

```bash
firebase deploy --only firestore
```

Expected output:
```
✔  firestore: released rules firestore.rules to cloud.firestore
✔  firestore: deployed indexes in firestore.indexes.json successfully
```

**Check:** open Firebase Console > Firestore > Rules and confirm the timestamp is current. Under Indexes, the composite indexes may show "Building" for a few minutes — this is normal.

---

## 7. Build and deploy all Firebase Functions

```bash
cd functions && npm run build && cd ..
```

Expected: `functions/lib/` populated. No errors.

```bash
firebase deploy --only functions
```

This deploys all 10 exported functions. Expected to end with:

```
✔  Deploy complete!
```

Full deploy takes 3–6 minutes. Wait for completion.

If a function fails with a secrets error, re-check Step 4.

---

## 8. Confirm `nowPaymentsWebhook` URL

```bash
firebase functions:list
```

Find `nowPaymentsWebhook` in the output and note its URL.

- If URL matches `https://europe-west1-sito-web-28a07.cloudfunctions.net/nowPaymentsWebhook` → no action needed, proceed to Step 9.
- If URL is different → update `NOWPAYMENTS_IPN_URL` in `functions/.env.sito-web-28a07` to the real URL, then re-run `firebase deploy --only functions`.

⚠️ Also manually update the IPN callback URL in the NOWPayments dashboard to match.

---

## 9. Seed Firestore config documents

Create a script file at `scripts/seed-firestore.js` (CommonJS Node.js). The script must:

1. Initialize `firebase-admin` using Application Default Credentials with `projectId: 'sito-web-28a07'`
2. Create `config/orderCounter` with `{ count: 0 }` using `{ merge: true }` — the field name is `count` (matches the atomic increment transaction in the checkout functions)
3. Create `config/bankDetails` with placeholder values:
   ```json
   {
     "beneficiary": "The Blondes Concept",
     "iban": "IT00X0000000000000000000000",
     "bic": "XXXXXXXX",
     "bank": "Banca Esempio"
   }
   ```
   using `{ merge: true }` so it does not overwrite if already set.
4. Log confirmation and call `process.exit(0)`

**Run with a service account (if available):**

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/seed-firestore.js
```

**Run with Application Default Credentials:**

```bash
gcloud auth application-default login    # if not already logged in
node scripts/seed-firestore.js
```

⚠️ **Human input:** if no service account JSON is available, the user must run `gcloud auth application-default login` and authorize with a Google account that has Firestore write access to the project.

**Verify:** open Firebase Console > Firestore > `config` collection. Confirm both `orderCounter` and `bankDetails` documents exist.

**Note:** after going live, the user must update `config/bankDetails` in the Firebase Console with the real IBAN, BIC, beneficiary, and bank name.

---

## 10. Register Stripe webhook and set `STRIPE_WEBHOOK_SECRET`

```bash
stripe webhooks create \
  --url https://europe-west1-sito-web-28a07.cloudfunctions.net/stripeWebhook \
  --events checkout.session.completed,checkout.session.expired
```

The CLI output includes a `Webhook signing secret` starting with `whsec_...`. Copy it.

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# paste the whsec_... value
```

Re-deploy functions to pick up the new secret:

```bash
firebase deploy --only functions
```

**Verify:** `firebase functions:secrets:list` now shows `STRIPE_WEBHOOK_SECRET`. In Stripe Dashboard > Developers > Webhooks, the endpoint shows status "Enabled" with two events listed.

---

## 11. Build the frontend

```bash
npm run build
```

Expected: `dist/` directory created/updated. No errors.

The frontend reads Firebase config from `firebase-applet-config.json` (imported as JSON — no `.env` changes needed).

---

## 12. Verify `netlify.toml`

Confirm the file at `<root>/netlify.toml` contains at minimum:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The SPA catch-all redirect (`/* → /index.html`) is critical — without it, direct URL navigation returns 404 on Netlify.

If the file does not exist, create it with the content above.

---

## 13. Deploy to Netlify

```bash
netlify deploy --prod --dir=dist
```

Expected output ends with:
```
✔  Deploy is live!
Website URL: https://theblondesconcept.netlify.app
```

If the site is not yet linked, the CLI prompts to choose the site. Select `theblondesconcept`.

**Check:** open `https://theblondesconcept.netlify.app` — homepage loads, no console errors, navigation works.

---

## 14. Smoke test checklist

⚠️ Manual — must be performed by the user in a browser.

- [ ] Homepage loads correctly
- [ ] Product pages load
- [ ] Add to cart → cart count updates in Navbar
- [ ] Guest checkout → Stripe test card `4242 4242 4242 4242` → `/checkout/success`
- [ ] Order in Firestore with `paymentStatus: 'paid'`
- [ ] Confirmation email received
- [ ] Bank transfer checkout → `/checkout/pending` with IBAN details shown
- [ ] Crypto checkout → NOWPayments redirect URL shown on `/checkout/pending`
- [ ] Telegram alert received when order created
- [ ] Admin email received at admin addresses
- [ ] `/admin/orders` accessible with admin email, orders listed
- [ ] `/account` accessible after login, own orders visible

---

## 15. Post-deploy manual steps

⚠️ These cannot be automated.

**A. Update bank details**

Firebase Console > Firestore > `config` > `bankDetails`.
Replace placeholder with real: `beneficiary`, `iban`, `bic`, `bank`.

**B. Verify email domain in Resend**

Emails are sent `from: ordini@theblondes.it`. To send from this address, verify `theblondes.it` in Resend dashboard > Domains (add SPF, DKIM, DMARC DNS records).

Until verified, Resend may reject sends silently — check Firebase Functions logs if emails are not arriving.

**C. Telegram bot setup**

Ensure the bot has been started or added to the target chat. Confirm `TELEGRAM_CHAT_ID` is the correct numeric chat ID. To find it: send a message to the bot then call `https://api.telegram.org/bot<TOKEN>/getUpdates`.

**D. NOWPayments IPN URL**

In NOWPayments dashboard > IPN Settings, confirm callback URL matches the `nowPaymentsWebhook` URL confirmed in Step 8.

**E. Stripe mode**

If tested with test keys (`sk_test_...`), switch to live keys by repeating Steps 4 and 10 with `sk_live_...` and a new live webhook secret.

---

## Files created/modified by the agent

| File | Action |
|---|---|
| `functions/src/orders/createCheckoutSession.ts` | Edit: CORS array |
| `functions/src/orders/bankTransfer.ts` | Edit: CORS array |
| `functions/src/orders/cryptoPayment.ts` | Edit: CORS array |
| `functions/src/orders/adminActions.ts` | Edit: CORS array |
| `functions/src/index.ts` | Edit: CORS array in vtoTryon |
| `functions/.env.sito-web-28a07` | **Create** |
| `scripts/seed-firestore.js` | **Create** |

All other files (`netlify.toml`, `firestore.rules`, `firestore.indexes.json`, `firebase-applet-config.json`, all `src/` frontend files, all other `functions/src/` files) are already correct — read but do not modify.
