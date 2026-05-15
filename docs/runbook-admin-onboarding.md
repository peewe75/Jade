# Guida Admin — The Blondes Concept

Manuale operativo per gestire il negozio, i prodotti e gli ordini.

---

## Accesso

1. Vai su `/login` del sito
2. Entra con la tua email admin
3. Nel menu in alto a destra → **Dashboard** (link appare solo agli admin)
4. Da Dashboard puoi accedere a: Inventario prodotti, Ordini, CRM clienti

---

## Aggiungere un nuovo prodotto

Vai a **Dashboard → Inventario**.

### Campi obbligatori
| Campo | Cosa mettere |
|---|---|
| **Immagine copertina** | Foto principale (verticale 4:3 o 3:4 ideale). Trascina o clicca per caricare. |
| **Nome (IT)** | Nome del pezzo in italiano, es. "Giacca Artigianale Garda" |
| **Nome (EN)** | Stesso nome in inglese |
| **Prezzo** | In euro, es. `320` (senza simbolo) |
| **Categoria** | Seleziona dalla lista |

### Campi testo (tab IT / EN)
Compila sempre **entrambe le lingue**:
- **Descrizione**: racconta il pezzo, l'ispirazione, come si indossa (2-4 righe)
- **Dettagli e cura**: materiali, come lavare, come conservare
- **Spedizione e resi**: tempi stimati, politica resi per quel pezzo

### Status prodotto
| Status | Quando usarlo |
|---|---|
| `draft` | Stai ancora preparando la scheda, non è visibile nel negozio |
| `active` | Visibile e acquistabile |
| `sold_out` | **Venduto** — rimane visibile ma non acquistabile (memoria storica) |
| `archived` | Nascosto completamente dal negozio |

> ⚠️ **Se vendi un pezzo offline** (di persona, Instagram DM, ecc.) — cambia subito lo status in `sold_out` prima che qualcuno lo compri anche online.

### Pezzo unico vs varianti

**Pezzo unico** (toggle `Pezzo Unico` attivo):
- Stock automatico = 1
- Non serve aggiungere varianti manualmente
- Non appena venduto → cambia status in `sold_out`

**Con varianti** (toggle disattivato):
- Aggiungi le taglie disponibili una per una
- Per ogni taglia: inserisci lo stock disponibile (es. S=2, M=1, L=3)
- Il sistema gestisce automaticamente la disponibilità

### Immagini aggiuntive
Puoi caricare fino a 4 immagini. Trascina per riordinare. La prima è sempre la copertina.

### In evidenza in homepage
Toggle **Featured** → il prodotto appare nella sezione Homepage.
Il campo **Ordine** determina la posizione (1 = primo).

### Salvare
Clicca **Salva Prodotto**. Il prodotto è live nel negozio immediatamente se status = `active`.

---

## Gestire un ordine

Vai a **Dashboard → Ordini**.

Ogni ordine ha un numero tipo `JD-2026-0001`.

### Stati ordine — pagamento
| Stato | Significato |
|---|---|
| `pending` | Ordine appena creato, pagamento non ancora confermato |
| `awaiting_payment` | Cliente ha scelto bonifico o crypto, sta per pagare |
| `paid` | Pagamento confermato (automatico per Stripe/crypto, manuale per bonifico) |
| `failed` | Pagamento fallito |
| `refunded` | Rimborsato |

### Flusso ordine tipico — carta di credito (Stripe)
1. Cliente paga → ordine automaticamente `paid`
2. Ricevi notifica Telegram + email
3. Quota la spedizione (vedi sotto)
4. Spedisci, inserisci tracking
5. Done ✓

### Flusso ordine — bonifico bancario
1. Cliente sceglie bonifico → ricevi notifica
2. Aspetti il bonifico sul conto (1-3 giorni lavorativi)
3. Quando ricevi il pagamento → Dashboard → Ordine → **Conferma Pagamento Bonifico**
4. Quota spedizione → spedisci → inserisci tracking

> ⚠️ Non spedire prima di confermare il bonifico ricevuto.

### Flusso ordine — crypto
1. Cliente paga in crypto → sistema verifica automaticamente
2. Ordine diventa `paid` in automatico (può richiedere 10-30 min su Bitcoin)
3. Quota spedizione → spedisci → inserisci tracking

### Come quotare la spedizione
1. Apri l'ordine
2. Controlla il paese di destinazione e il peso stimato del pezzo
3. Calcola il costo con il tuo corriere preferito (DHL, FedEx, BRT, ecc.)
4. Dashboard → Ordine → **Inserisci quota spedizione** (corriere, costo, giorni stimati)
5. Il cliente riceve automaticamente un'email con il link per pagare la spedizione
6. Quando il cliente paga → spedisci il pacco

### Inserire il tracking
1. Ordine → **Conferma spedizione**
2. Inserisci: nome corriere, numero tracking, link tracking (se disponibile)
3. Il cliente riceve email automatica con i dati

---

## Prodotto venduto fuori dal sito

Se vendi un pezzo tramite Instagram, WhatsApp, di persona:

**Fai subito queste 2 cose:**

1. **Dashboard → Inventario** → cerca il prodotto → **Modifica** → Status → `sold_out` → Salva
2. Se vuoi registrare la vendita: crea una nota nel CRM per il cliente

> Non farlo = rischio che qualcun altro compri lo stesso pezzo online.

---

## CRM clienti

**Dashboard → CRM**

Usa il CRM per:
- Tenere traccia dei clienti abituali
- Segnare note su gusti, taglie, preferenze
- Gestire il pipeline di vendita (contatto → trattativa → acquisto → follow-up)

### Workflow tipico
1. Nuovo contatto da Instagram/email → aggiungi cliente con stage `Lead`
2. Conversazione in corso → stage `Contatto`
3. Interesse concreto → stage `Proposta`
4. Acquisto → stage `Cliente`
5. Post-vendita → aggiungi nota (soddisfazione, taglie, preferenze colore)

---

## Notifiche

Quando arriva un ordine nuovo ricevi:
- **Messaggio Telegram** nel gruppo admin con riepilogo ordine e link diretto
- **Email** con dettaglio completo

Se non ricevi notifiche entro 5 minuti da un ordine: controlla la sezione Ordini in Dashboard — l'ordine c'è comunque, le notifiche potrebbero aver avuto un intoppo temporaneo.

---

## FAQ operativa

**Posso modificare il prezzo di un prodotto già pubblicato?**
Sì. Ma se qualcuno ha già il prodotto nel carrello vedrà il vecchio prezzo fino al checkout (il sistema riprezza in quel momento). Conveniente comunicare cambi di prezzo in anticipo.

**Come faccio a "nascondere" un prodotto temporaneamente?**
Cambiane lo status in `draft`. Non sarà visibile nel negozio ma non lo perdi.

**Il cliente mi chiede un rimborso — cosa faccio?**
Dashboard → Ordine → **Rimborso**. Inserisci l'importo (parziale o totale). Stripe processa automaticamente entro 5-10 giorni lavorativi. Per bonifico/crypto: rimborso manuale, segnalo nelle note ordine.

**Quante immagini posso caricare per prodotto?**
Massimo 4. La prima è la copertina nel negozio.

**Posso avere lo stesso prodotto in più taglie?**
Sì — disattiva il toggle "Pezzo Unico" e aggiungi le varianti con le rispettive disponibilità.

**Come aggiungo una nuova categoria?**
Inventario → sezione Categorie (in fondo alla pagina) → inserisci nome → Aggiungi.
