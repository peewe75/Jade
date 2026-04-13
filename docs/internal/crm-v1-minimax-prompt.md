# CRM V1 — Prompt operativo per Minimax

Questo prompt è stato usato come base di implementazione per la prima versione del CRM.  
Va tenuto come documentazione interna del progetto, utile per ricostruire contesto, vincoli e scope iniziale.

## Prompt

Sei dentro questo repository React/Vite/Firebase e devi implementare una V1 completa di CRM reale, senza cambiare il branding del sito esistente.

### Contesto attuale

- Esistono già `/admin`, `/admin/crm`, `/admin/inventory`.
- Esiste già una collezione Firestore `clients`.
- `src/contexts/AuthContext.tsx` crea già `users/{uid}` e assicura un `clients/{uid}` quando l’utente si registra o accede.
- `src/pages/CRM.tsx` oggi è una vista base con CRUD clienti, filtri semplici e import utenti.
- `firestore.rules` contiene già regole base per `clients`.
- `Inventory` e `Admin` esistono già e non vanno stravolti visivamente.

### Obiettivo

Trasformare l’attuale CRM in un vero CRM operativo commerciale, centrato su pipeline lead/clienti, timeline, task e scheda cliente completa, mantenendo Firestore come backend.

### Vincoli

- NON rompere il layout, i colori, il brand o la struttura generale del sito.
- NON introdurre backend esterni o nuovo DB.
- Mantieni compatibilità con i record `clients` esistenti.
- I nuovi campi devono avere fallback sensati.
- Leggi e rispetta eventuali `AGENTS.md` se presenti.
- Esegui il lavoro end-to-end: implementazione, regole Firestore, UI admin, validazione (`npm run lint`, `npm run build`), e se il progetto è già collegato, deploy.
- Non fare refactor gratuiti fuori scope.

### Implementa questa specifica

#### 1. Modello dati

- Estendi `clients` con campi opzionali/fallback:
  - `stage`: one of `new_lead | contacted | qualified | customer | vip | inactive`
  - `source`
  - `uid?`
  - `email?`
  - `phone?`
  - `company?`
  - `tags?`
  - `ownerId?`
  - `preferredCategories?`
  - `preferredSizes?`
  - `lastContactAt?`
  - `nextFollowUpAt?`
  - `lastActivityAt?`
  - metriche aggregate minime:
    - `totalOrders`
    - `totalSpent`
    - `notesCount`
- Aggiungi collezioni:
  - `clientActivities`
    - `clientId`, `type`, `title`, `body?`, `createdAt`, `createdBy`, `metadata?`
  - `clientTasks`
    - `clientId`, `title`, `status`, `dueAt?`, `assignedTo?`, `createdAt`, `updatedAt`, `completedAt?`
  - `clientTags`
    - tag gestibili da admin, almeno `name`, `color?`, `createdAt`
- Predisponi foundation backend per future collezioni `orders` e `wishlists` ma non creare flussi finti se il sito non li usa ancora.

#### 2. Workflow CRM

- Il flusso principale è pipeline lead:
  - `new_lead -> contacted -> qualified -> customer -> vip -> inactive`
- Ogni evento importante deve creare una activity:
  - `created`
  - `imported`
  - `stage_changed`
  - `note_added`
  - `task_created`
  - `task_completed`
  - `profile_updated`
- Admin deve poter:
  - creare cliente manualmente
  - modificare dati cliente
  - cambiare stage
  - aggiungere nota
  - creare task
  - chiudere task
  - pianificare follow-up
- Import `users -> clients` deve:
  - creare solo i mancanti
  - deduplicare per `uid`
  - non sovrascrivere i clienti già curati manualmente

#### 3. Auth e bootstrap dati

- Mantieni registrazione/login email-password e Google già presenti.
- Ogni registrazione/login deve garantire esistenza di `users/{uid}` e `clients/{uid}`.
- Se esiste `users/{uid}` ma manca `clients/{uid}`, ricrearlo in best-effort.
- `source` deve distinguere almeno:
  - `site`
  - `google`
  - `session`
  - `admin-manual`
  - `import-users`

#### 4. UI admin CRM

Trasforma `/admin/crm` in una vera area operativa:

- header con contatori pipeline
- filtri per:
  - stage
  - source
  - owner
  - tag
  - “registrati dal sito” vs “manuali”
- ricerca testuale
- lista clienti
- pannello dettaglio cliente con:
  - dati profilo
  - stage
  - tag
  - source
  - metriche
  - note
  - task
  - timeline attività
- quick actions visibili:
  - nuovo cliente
  - importa utenti
  - aggiungi nota
  - crea task
  - cambia stage
  - pianifica follow-up
- Mantieni coerenza con il design attuale, senza introdurre una UI completamente diversa.

#### 5. Firestore rules

- Aggiorna le regole per supportare:
  - `clients`
  - `clientActivities`
  - `clientTasks`
  - `clientTags`
- Requisiti:
  - lettura CRM solo admin
  - scrittura CRM admin-only
  - bootstrap pubblico consentito solo per il proprio record cliente minimo
  - campi opzionali `null` accettati quando sensato
  - compatibilità con documenti esistenti

#### 6. Qualità

- Tipizza bene i modelli TS.
- Evita `any` dove possibile.
- Mantieni codice leggibile e minimo.
- Se serve, aggiungi piccoli helper riusabili per attività, task e timeline.
- Non inserire commenti inutili.

#### 7. Verifica finale

- Esegui:
  - `npm run lint`
  - `npm run build`
- Se il progetto è già collegato:
  - deploy frontend su Netlify
  - deploy Firestore rules/indexes
- Riporta:
  - cosa hai cambiato
  - file principali toccati
  - eventuali limiti residui
  - comandi di verifica eseguiti

### Importante

- Non limitarti a descrivere il piano: scrivi davvero il codice.
- Se trovi piccoli problemi già presenti ma fuori scope, non rifattorizzare tutto; aggirali con precisione.
- Se manca un dettaglio, scegli la soluzione più coerente con questa specifica e documentala nel riepilogo finale.
