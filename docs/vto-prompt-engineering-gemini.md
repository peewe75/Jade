# VTO Prompt Engineering — Brief per Gemini

Questo file raccoglie i prompt da incollare, in sequenza, in una conversazione con **Gemini 2.5 Pro** su <https://gemini.google.com>, per costruire e iterare il prompt perfetto del Camerino Virtuale di The Blondes.

**Come usarlo:**

1. Apri https://gemini.google.com, nuova chat, seleziona modello **Gemini 2.5 Pro**.
2. Incolla il **Prompt 1** (dossier completo) come primo messaggio.
3. Ricevi Parte A + Parte B + Parte C dalla risposta di Gemini.
4. Se serve raffinare, usa i **Prompt 2 / 3 / 4 / 5** come follow-up nella stessa conversazione (mantengono il contesto del Prompt 1).
5. Copia il prompt finale (Parte B) e incollalo in `functions/src/index.ts` al posto del prompt attuale.
6. `npm run build` in `functions/` → `firebase deploy --only functions --project jade-crm-2026-v2 --force`.

---

## Prompt 1 — Dossier iniziale (da incollare per primo)

````markdown
# DOSSIER — VTO PROMPT ENGINEERING

## ROLE (cosa sei tu, Gemini)

Sei un senior prompt engineer specializzato in **image editing multi-immagine** con modelli di tipo Nano-Banana / Gemini 2.5 Flash Image. Il tuo compito è progettare il **prompt perfetto** per un sistema di Virtual Try-On (VTO) di un e-commerce di moda di lusso.

Alla fine mi restituirai:
1. Un'**analisi ragionata** dei casi limite e di come gestirli
2. Il **prompt finale in inglese**, strutturato in blocchi, pronto da interleavare con le immagini
3. Un **test plan** per verificarne la qualità

---

## 1. STACK TECNICO

- **Modello immagine**: `google/gemini-2.5-flash-image` (Nano-Banana) via OpenRouter
- **Endpoint**: `POST https://openrouter.ai/api/v1/chat/completions`
- **Capability chiave**: accetta N immagini + testi interleavati nello stesso messaggio utente, restituisce 1 immagine editata
- **Modalities**: `['image', 'text']`
- **Payload shape**:
  ```json
  {
    "model": "google/gemini-2.5-flash-image",
    "modalities": ["image", "text"],
    "messages": [{
      "role": "user",
      "content": [
        { "type": "text", "text": "<blocco pre-image-1>" },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,<customer>" } },
        { "type": "text", "text": "<blocco pre-image-2>" },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,<product>" } },
        { "type": "text", "text": "<istruzione finale di generazione>" }
      ]
    }]
  }
  ```
- Le immagini hanno ordine **garantito** come inviato. Gemini 2.5 Flash Image è in grado di referenziarle per posizione (IMAGE 1, IMAGE 2) se gliele etichetti esplicitamente nel testo.

## 2. DOMINIO DI BUSINESS

- **Brand**: The Blondes — e-commerce di moda **femminile di fascia medio-alta** (abiti, giacche, gonne, camicie, maglieria, outerwear, accessori)
- **Sito**: https://blondejade.netlify.app
- **Uso**: cliente autenticata carica una propria foto, poi su una scheda prodotto attiva il "Camerino Virtuale" → deve vedersi indossare il prodotto
- **Target emotivo**: vuole *credere* di indossare davvero quel capo → il fotorealismo e la fedeltà al prodotto sono *critici* per la conversione

## 3. INPUT CHE ARRIVANO AL MODELLO

### IMAGE 1 — Foto utente (customer)
Caricata dalla cliente dal proprio dispositivo. Può essere:
- Selfie frontale a mezzo busto
- Foto intera di sé stessa (full body)
- Foto di profilo / tre quarti
- Foto con sfondo qualunque (casa, strada, specchio, studio)
- Foto già con un outfit indossato (sempre)
- Qualità variabile, illuminazione variabile

### IMAGE 2 — Foto prodotto (catalogo e-commerce)
Viene dalla pagina prodotto. Il suo formato è **imprevedibile** e include:

| Presentation | Esempio | Difficoltà |
|---|---|---|
| **Ghost mannequin / flat lay** | Capo fotografato da solo su sfondo bianco | Nessuna pelle umana; dedurre il drappeggio sul corpo |
| **Manichino rigido** | Busto di plastica | Forma del corpo artificiale, ignorarla |
| **Indossato da modella** | Un'altra donna indossa il capo | **NON copiare il volto della modella**, solo il capo |
| **Vista frontale** | Tipico shot principale | Facile |
| **Vista posteriore / back** | Mostra solo il retro | **Il modello deve inferire il fronte dal retro** |
| **Vista laterale / three-quarter** | Mostra solo un lato | Inferenza geometrica |
| **Close-up dettaglio** | Manica, collo, bottone | Serve per texture ma non basta da solo |
| **Una sola foto per prodotto** | (no carousel) | Vincolo del sistema |

Il prodotto può quindi essere un **vestito floreale su manichino visto da dietro** — e il sistema dovrebbe comunque generare una cliente che lo indossa **vista frontale** (stessa posa di IMAGE 1), ricostruendo coerentemente il davanti.

Metadata testuali disponibili: `productName` (string), `productCategory` (string, es. "Dresses", "Outerwear").

## 4. OUTPUT ATTESO

- **Una sola** immagine fotorealistica
- La **stessa persona** di IMAGE 1 (volto, capelli, skin tone, corporatura, posa, mani, sguardo, makeup)
- Nella **stessa scena** di IMAGE 1 (sfondo, illuminazione, ombre, angolo camera, framing)
- Che indossa **esattamente** il capo di IMAGE 2 (colore, pattern, tessuto, taglio, lunghezza, collo, maniche, chiusure, cinture, fessure)
- **Nessun vestito residuo** di IMAGE 1 visibile sotto / sopra il prodotto
- **Nessun capo extra** non presente in IMAGE 2
- No testo, no watermark, no collage, no split screen, no persone extra

## 5. CASI LIMITE CRITICI — DEVONO ESSERE GESTITI DAL PROMPT

Ordinati per severità:

1. **Prodotto visto di retro** → Inferire il fronte in modo plausibile dalla categoria. Non lasciare la cliente di spalle per "barare".
2. **Prodotto su modella diversa** → Estrai solo il capo, ignora totalmente il volto/corpo della modella del catalogo.
3. **Prodotto flat-lay** → Ricostruisci come si drappeggerebbe sul corpo della cliente, con pieghe, ombre, tensione tessuto realistiche.
4. **Cliente già vestita** → I vestiti originali scompaiono. Mai layering, mai mix.
5. **Cliente in posa non frontale** (tre quarti, profilo) → Rispetta la posa, adatta il capo alla vista.
6. **Cliente a mezzo busto** → Genera mostrando il capo nella porzione visibile; decidi se è meglio estendere o mantenere il framing.
7. **Luce/stagione incongruenti** → Vince l'illuminazione di IMAGE 1.
8. **Dettagli non visibili nel prodotto** → Plausibilità, ma non inventare dettagli.
9. **Colore/pattern prodotto simile a quello già indossato** → Rischio di "fondere": serve istruzione esplicita.
10. **Accessori personali della cliente** (borsa, occhiali, orologio) in IMAGE 1 → Mantieni quelli, rimuovi quelli del catalogo.

## 6. PROMPT ATTUALE (da migliorare)

```
### SYSTEM INTRO
You are a photorealistic virtual try-on engine. Your job is to produce ONE 
photograph of the person in IMAGE 1 wearing EXACTLY the garment shown in 
IMAGE 2. Nothing else.

### IMAGE 1 — CUSTOMER PHOTO
This is the real customer. Everything about this person must be preserved: 
face, hair, skin tone, makeup, body shape, pose, hands position, background, 
lighting, camera angle, framing. Treat their identity as sacred.

[ IMAGE 1 ]

### IMAGE 2 — PRODUCT TO TRY ON: "${productName}" (category: ${productCategory})
This is the ONLY garment the customer must be wearing in the output. 
Reproduce it EXACTLY as shown: same color, same pattern/print, same fabric, 
same cut, same length, same neckline, same sleeves, same collar, same 
buttons/zippers, same straps, same belt. Do not invent variations. Do not 
substitute with a similar-looking item.

[ IMAGE 2 ]

### OUTPUT RULES (STRICT)
1. REPLACE any clothing currently visible on the person in IMAGE 1 with the 
   garment from IMAGE 2. Never layer. Never mix.
2. DO NOT add any garment or accessory that is not present in IMAGE 2.
3. KEEP the person's face, hair, skin tone, body proportions, and pose from 
   IMAGE 1 unchanged.
4. KEEP the background, lighting, shadows direction, and camera angle from 
   IMAGE 1.
5. Fit the garment naturally on the body with realistic drape, folds, and 
   shadows that match the lighting of IMAGE 1.
6. Output a single high-resolution photograph. No text, no logos, no 
   watermarks, no collage, no split screen, no multiple people.

Now produce the single photorealistic try-on image: the person from IMAGE 1, 
in the same pose and scene, wearing ONLY the garment from IMAGE 2.
```

### Cosa non funziona nel prompt attuale
- **Non dà istruzioni su come leggere l'orientamento del prodotto** (fronte / retro / flat / modella)
- **Non distingue il caso "modella diversa in IMAGE 2"**: rischia di mescolare volti
- **Non ha un passaggio di "reasoning prima del pixel"**
- **Accessori personali della cliente** non sono protetti esplicitamente
- **Nessuna direttiva framing** se la cliente è in mezzo busto con un prodotto full-length

## 7. VINCOLI OPERATIVI

- Il prompt è interleavato: posso inserire testo **prima e dopo** ogni immagine
- Il modello deve restituire **solo un'immagine**, non testo (no chain-of-thought visibile)
- Single-shot, no agent loop
- Nessun modello di segmentazione esterno disponibile
- Nessun pre-processing delle immagini

## 8. OUTPUT CHE VOGLIO DA TE, GEMINI

### Parte A — Analisi (max 400 parole)
Spiegami:
- Come classificheresti automaticamente il tipo di IMAGE 2 (front/back/flat/on-model) tramite **solo istruzioni di testo**
- Quali casi limite della sezione 5 sono più pericolosi per la qualità percepita
- Se è meglio mettere le "view-inference rules" PRIMA o DOPO l'immagine del prodotto, e perché

### Parte B — Prompt finale ottimizzato (in inglese)
Struttura:
- `### SYSTEM` — ruolo e task
- `### IMAGE 1 — CUSTOMER` (testo prima di image 1)
- `[IMAGE 1]`
- `### IMAGE 2 — PRODUCT: "${productName}" (${productCategory})` (testo prima di image 2)
  - Istruzioni per classificare la vista (front/back/side/flat/on-model)
  - Istruzioni per inferire le parti mancanti coerentemente con la categoria
  - Istruzioni per estrarre solo il capo se c'è una modella catalogo
- `[IMAGE 2]`
- `### TRANSFER RULES` (identità cliente + scena + sostituzione totale outfit + gestione accessori personali)
- `### NEGATIVE` (lista esplicita di cosa NON fare)
- `### QUALITY` (fotorealismo, coerenza illuminazione, drappeggio)
- `### FINAL INSTRUCTION`

Usa **placeholders**: `${productName}`, `${productCategory}`. Deve essere copia-incollabile in un template literal JavaScript.

### Parte C — Test plan (max 8 test case)
8 combinazioni [foto cliente × foto prodotto] che coprono i casi limite più pericolosi, con:
- Setup
- Rischio di fallimento
- Criterio di successo osservabile

---

## NOTE FINALI

- Non diluire il prompt con fluff marketing. Deve essere **tecnico, imperativo, specifico**.
- Lingua prompt: **inglese** (i modelli image seguono meglio).
- Tono: come se stessi programmando un robot ottuso ma potentissimo.
- Se hai dubbi, proponi **A/B alternative** e dichiara quale preferisci.
- Obiettivo: prompt che funzioni in **single-shot** al 90%+ dei casi realistici di un e-commerce di moda donna.

Procedi con **Parte A → Parte B → Parte C**.
````

---

## Prompt 2 — Se il prompt restituito è troppo lungo

Da usare se la Parte B supera i ~500 token (rischia di "diluire" l'attenzione del modello image):

```
Il prompt è troppo verboso. I modelli image perdono aderenza oltre ~500 token.

Comprimi il prompt di Parte B mantenendo:
- tutti i negative constraints
- tutti i casi edge (front/back/flat/on-model)
- la protezione dell'identità della cliente

Rimuovi:
- ripetizioni concettuali
- avverbi di enfasi ridondanti (truly, really, absolutely)
- frasi di cortesia

Target: < 450 token totali (contando testo pre-image-1 + pre-image-2 + post-image-2).

Rimandami solo il prompt compresso, stesso formato a blocchi.
```

---

## Prompt 3 — Per far generare varianti specifiche

Da usare per avere una versione specializzata per categoria merceologica:

```
Per ogni macro-categoria dell'e-commerce, genera una MICRO-VARIANTE del blocco 
"### IMAGE 2 — PRODUCT" che ottimizzi l'inferenza view+drape per quella categoria:

1. Dresses (abiti lunghi/midi/mini)
2. Outerwear (giacche, cappotti, trench)
3. Tops (camicie, bluse, t-shirt, maglieria)
4. Bottoms (gonne, pantaloni, shorts)
5. Knitwear (maglioni, cardigan)

Per ognuna specifica:
- Parti del capo più critiche da preservare (es. per Dresses: orlo + scollo + vita)
- Cosa inferire se il prodotto è visto di retro
- Drappeggio caratteristico da riprodurre

Output: 5 blocchi di max 80 token ciascuno, stessa struttura del blocco principale.
```

---

## Prompt 4 — Dopo un test reale (per iterare)

Da usare dopo aver provato il prompt finale sul sito e aver trovato un fallimento:

```
Ho testato il prompt Parte B in produzione. Un test è andato male:

**Setup:**
- IMAGE 1: foto della cliente [descrivi: es. mezzo busto, sfondo casa, maglietta bianca indossata]
- IMAGE 2: foto prodotto [descrivi: es. abito floreale visto da dietro su manichino]
- Prodotto: "${productName}" (${productCategory})

**Cosa è andato storto:**
[incolla screenshot o descrivi: es. "il modello ha mantenuto la maglietta bianca sotto l'abito e ha aggiunto un trench cammello che non era nel prodotto"]

**Risultato atteso:**
[es. "l'abito floreale da solo, con scollo plausibile davanti visto che il prodotto era mostrato di retro"]

Analizza quale parte del prompt ha fallito e proponi una modifica MINIMALE 
(non riscrivere tutto). Spiega il reasoning della modifica.
Rimandami solo il diff: blocco originale → blocco nuovo.
```

---

## Prompt 5 — Red-team del prompt (secondo parere)

Da usare dopo aver ricevuto Parte B, per stress-testare il prompt con uno sguardo critico:

```
Ora cambia cappello. Sei un red-teamer di AI safety / quality.

Guarda il prompt finale che hai appena prodotto (Parte B) e attaccalo:
- Trova 5 input realistici che possono farlo fallire
- Per ciascuno, spiega perché il prompt attuale non li copre
- Proponi una singola riga di testo da aggiungere al prompt per coprire ciascun buco

Vincolo: ogni "patch" deve essere < 20 parole e non deve contraddire 
altre regole già presenti. Se due patch sono in conflitto, dichiaralo.

Output:
| # | Input avversariale | Cosa sbaglia il prompt | Patch proposta |
|---|-------------------|------------------------|----------------|
```

---

## Prompt 6 — Genera anche la versione italiana (opzionale)

Utile se un giorno volessi testare in italiano per capire se Gemini segue meglio nella lingua del brand:

```
Traduci il prompt finale Parte B in italiano, mantenendo:
- la stessa struttura a blocchi ### 
- gli stessi placeholder ${productName} ${productCategory}
- lo stesso tono imperativo-tecnico
- i termini tecnici moda tradotti correttamente (neckline=scollo, hem=orlo, drape=drappeggio, etc.)

Poi dichiara esplicitamente la tua previsione: per `google/gemini-2.5-flash-image`,
funziona meglio il prompt inglese o italiano? Motiva in max 3 righe.
```

---

## Flusso operativo consigliato

```
┌─────────────────────────────────────────┐
│ 1. Incolla Prompt 1 → ricevi A + B + C  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. Prompt B troppo lungo?               │
│    → usa Prompt 2 (compress)            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. Usa Prompt 5 (red-team)              │
│    → applica patch proposte             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. Deploy e testa                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 5. Fallimento? → usa Prompt 4 (iter)    │
│    Loop finché ≥ 90% dei test passano   │
└─────────────────────────────────────────┘
```

## Dove incollare il prompt finale

File: `functions/src/index.ts`

Sostituisci il blocco che inizia con:

```typescript
const systemIntro = `You are a photorealistic virtual try-on engine...`;
```

fino a:

```typescript
const productPrompt = `${productLabel}\n\n${rulesLabel}`;
```

con i nuovi blocchi generati da Gemini (rispettando i `${productName}` e `${productCategory}` come variabili del template literal).

Poi:

```bash
cd functions
npm run build
cd ..
npx firebase deploy --only functions --project jade-crm-2026-v2 --force
```
