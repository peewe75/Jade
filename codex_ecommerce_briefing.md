# Codex Briefing — E-commerce Implementation for The Blondes Concept (Jade)

## Cosa devi fare

Implementare un e-commerce completo per il sito React+Vite+TS+Firebase di "The Blondes Concept" (brand di moda artigianale, pezzi unici fatti a mano). Il piano dettagliato è già stato approvato dall'utente ed è in:

**`C:\Users\avvsa\.claude\plans\voglio-aggiungere-e-commerce-a-majestic-scroll.md`**

LEGGILO PER PRIMO. Contiene: modello dati, Cloud Functions, frontend, sicurezza, fasi numerate, file critici, test E2E, rischi.

## Vincoli hard (non negoziabili)

1. **Home page intoccabile**: `src/pages/Home.tsx` e i suoi 8 componenti (`Hero`, `Marquee`, `FeaturedProducts`, `EditorialSpotlight`, `StoryGrid`, `LookFeature`, `CommunitySection`, `ClosingCta`) NON vanno modificati strutturalmente. Eccezione minima: `FeaturedProducts.tsx` può leggere `product.translations[lang]` con fallback al campo legacy. Niente redesign, niente sezioni nuove, niente riordino.
2. **Brand naming unificato**: `The Blondes Concept`. Sweep di tutti i file dove appare "The Blondes Brand", "The Blondes Cube", "Jade" come brand (NON come repo/path) e uniforma.
3. **VTO esistente** (Cloud Function in `functions/src/index.ts` + endpoint `server.ts`/`netlify/functions/api.ts`) NON va toccato. È in produzione.
4. **Retrocompatibilità prodotti**: i prodotti esistenti in Firestore devono continuare a funzionare. Vedi backfill nel piano.
5. **Prezzi sempre in cents (int)**, mai float. Formatting solo display.
6. **Sicurezza pagamenti**: prezzo MAI dal client. Riprezzo server-side da Firestore in `createCheckoutSession`. Idempotency su webhook.

## Decisioni già prese (NON richiedere conferma)

| Area | Scelta |
|---|---|
| Pagamenti | Stripe + bonifico bancario + crypto via NOWPayments |
| Email transazionali | Resend (con React Email templates) |
| Notifiche admin | Telegram Bot API + email Resend (WhatsApp rinviato a fase futura, NON implementare) |
| i18n | react-i18next + i18next-browser-languagedetector, IT + EN |
| Guest checkout | Attivo (email obbligatoria, magic link post-acquisto opzionale) |
| Storage media | Firebase Storage per nuovi upload (migrare da base64 attuale) |
| IVA | Default forfettario (no calcolo IVA), configurabile dopo |
| Cookie banner | Custom React, niente vendor esterno |
| Spedizione | Quotata dall'admin caso-per-caso DOPO ordine (Stripe Payment Link separato per shipping) |
| Region Functions | europe-west1 |
| Region Firestore | eur3 |
| Currency primaria | EUR, salvata come int cents |

## Stack già presente da riusare

- `src/contexts/AuthContext.tsx` — Auth Firebase con email/Google + check 4 admin email hardcoded
- `src/contexts/FavoritesContext.tsx` — pattern da imitare per `CartContext` (Firestore + listener)
- `src/lib/crm.ts` — pattern Firestore TX per `reserveVariant`
- `src/components/EditorialSpotlight.tsx` — pattern visivo da riusare in `ProductStory.tsx` (split immagine/testo alternato)
- `src/pages/Inventory.tsx` — esiste, va esteso (varianti, traduzioni, story, status, upload Storage)
- `src/pages/Product.tsx` — esiste, va esteso (VariantSelector, storytelling, i18n, add-to-cart)
- `src/pages/Shop.tsx` — esiste, va esteso (Collections tabs)
- `src/pages/Admin.tsx` — esiste, va esteso (link a `/admin/orders`)
- `firestore.rules` — esiste, va esteso (vedi piano sezione D)
- `firestore.indexes.json` — esiste, aggiungere index orders

## Fasi: ordine d'esecuzione

Procedi nell'ordine. Ogni fase è un commit separato (o più, se grande). Non passare alla successiva finché la precedente non è testabile.

1. **F1** — Modello dati + Firebase Storage migration + Inventory esteso (variants/translations/story/status, uploader Storage). Script `scripts/backfill-products.ts` per migrare prodotti esistenti.
2. **F2** — i18n setup (file IT/EN, switcher Navbar, lettura `translations[lang]` su Shop/Product/FeaturedProducts con fallback).
3. **F3** — Shop "Collections" tabs + Product storytelling sections + VariantSelector + stock badge.
4. **F4** — `CartContext` + `/cart` + merge guest→user.
5. **F5** — Checkout Stripe end-to-end (Cloud Functions `reserveVariant`, `createCheckoutSession`, `stripeWebhook` idempotente, success page con polling fallback, email Resend cliente).
6. **F6** — Bonifico flow.
7. **F7** — Crypto NOWPayments.
8. **F8** — Admin `/admin/orders` + dispatcher notifiche (Telegram + email).
9. **F9** — `/account` user area (tabs orders/wishlist/try-ons/profile).
10. **F10** — Shipping admin-quote flow (Stripe Payment Link separato).
11. **F11** — Cookie banner custom + privacy/terms/cookies pages.

**Min path produttivo per primo flusso vendita reale**: F1 → F2 → F4 → F5.

## Test E2E richiesti

- Firebase emulators (Auth+Firestore+Functions+Storage)
- Stripe CLI: `stripe listen --forward-to localhost:5001/.../stripeWebhook`
- NOWPayments sandbox per F7
- Test esplicito race condition pezzo unico: 50 richieste parallele su stesso variant → solo 1 vince, 49 ricevono errore "esaurito"
- Test webhook idempotency: replay stesso `event.id` → no doppio decrement stock
- Test merge cart: guest add → login → no duplicati, qty=max
- Test rules: utente non admin non legge ordini altrui

## Output atteso da Codex per ogni fase

1. Diff dei file modificati/creati
2. Comandi npm da eseguire (`firebase functions:secrets:set ...`, `npm install ...`)
3. Comandi di verifica (es. `firebase emulators:start`, scenari Stripe CLI)
4. Note rischi residui o decisioni ambigue incontrate

## Cose che Codex NON deve fare

- Non aggiungere dipendenze non in piano senza giustificazione esplicita
- Non modificare `Home.tsx` o suoi figli (vedi vincoli)
- Non toccare codice VTO (`functions/src/index.ts` esistente, `server.ts` route `/api/vto/process`, `netlify/functions/api.ts`, `MyTryOns.tsx`)
- Non fidarsi mai di prezzi dal client
- Non usare float per prezzi
- Non implementare WhatsApp (rinviato)
- Non implementare cookie vendor (Iubenda/Cookiebot scartati)
- Non aggiungere multivaluta in F1-F11 (EUR only)
- Non modificare il modello dati esistente CRM (`types/crm.ts`, `lib/crm.ts`)

## Domande aperte ammesse

Solo se incontri ambiguità tecniche concrete durante l'implementazione (es. "il file X ha un pattern Y che non combacia con la convenzione Z, procedo con A o B?"). Non riaprire decisioni già prese sopra.

## Riferimenti rapidi

- Piano completo: `C:\Users\avvsa\.claude\plans\voglio-aggiungere-e-commerce-a-majestic-scroll.md`
- Stack confermato: React 19, Vite, TS, Tailwind 4, Framer Motion, react-router-dom 7, Firebase 12, Netlify
- Admin email check: vedi `AuthContext.tsx` per la lista hardcoded da riusare in `firestore.rules` e Cloud Functions admin
- Secrets richiesti: `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`
