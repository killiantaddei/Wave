# Wave — social video verticale (TikTok-style)

App web in React + Supabase: feed video a scorrimento verticale, upload, like, commenti,
follow tra utenti, login/registrazione e riconoscimento dispositivo (Android → schermata
"scarica l'app", iPhone → istruzioni "Aggiungi a Home").

## 1. Configura Supabase (5 minuti)

1. Vai su [supabase.com](https://supabase.com) → crea un nuovo progetto (o usa quello vuoto che hai già).
2. Apri **SQL Editor** → **New query**, incolla **tutto** il contenuto di `supabase/schema.sql`
   e clicca **Run**. Questo crea: tabelle (`profiles`, `videos`, `likes`, `comments`, `follows`),
   i trigger che creano il profilo alla registrazione e aggiornano i contatori, le policy di
   sicurezza (RLS) e i bucket di storage `videos` e `avatars` (pubblici in lettura).
3. Vai su **Project Settings → API**: copia **Project URL** e **anon public key**.

## 2. Configura le variabili d'ambiente in locale

```bash
cp .env.example .env
```

Apri `.env` e incolla i valori copiati da Supabase:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=la-tua-anon-key
```

## 3. Avvia in locale

```bash
npm install
npm run dev
```

Apri http://localhost:5173 — su desktop vedrai l'app normalmente (il riconoscimento
dispositivo si attiva solo su mobile). Per testare la schermata Android/iPhone, apri lo
stesso indirizzo dal telefono (sulla stessa rete Wi-Fi) o usa gli strumenti "device
emulation" di Chrome DevTools.

## 4. Pubblica su Cloudflare Pages

1. Carica questa cartella su un repository GitHub (o GitLab).
2. Su [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Seleziona il repository. Imposta:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. In **Environment variables** aggiungi le stesse due variabili di `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clicca **Save and Deploy**. In 1-2 minuti l'app è online su un dominio `*.pages.dev`
   (puoi collegare un dominio personalizzato dopo, da **Custom domains**).

Il file `public/_redirects` è già incluso e indica a Cloudflare Pages di servire
`index.html` per ogni rotta, necessario perché l'app gestisce la navigazione lato client
(React Router).

## Come funziona il riconoscimento del dispositivo

Il file `src/lib/useDeviceDetect.ts` analizza `navigator.userAgent` al caricamento:

- **Android** → mostra una schermata a tutto schermo con bottone "Scarica l'app", che
  punta al link Google Play impostato in `src/components/DeviceGate.tsx`
  (costante `ANDROID_APP_URL` — sostituiscila con il link reale quando pubblichi l'app).
- **iPhone/iPad** → mostra le istruzioni passo-passo per "Aggiungi a Home" (il sito
  diventa una PWA installabile, a schermo intero, grazie a `public/manifest.json`).
- **Desktop** → nessuna schermata, si entra direttamente nell'app.

In tutti i casi mobile è presente un pulsante "Continua nel browser" per chi vuole
comunque usare il sito senza scaricare nulla o senza installarlo.

Se l'app è già stata aggiunta alla schermata Home (modalità PWA standalone), la
schermata non viene più mostrata.

## Struttura del progetto

```
src/
  components/   DeviceGate, VideoCard, CommentsSheet, BottomNav
  pages/        Feed, Upload, ProfilePage, Auth
  context/      AuthContext (sessione + profilo Supabase)
  lib/          supabaseClient, useDeviceDetect, types
supabase/
  schema.sql    schema completo da eseguire su Supabase
```

## Prossimi passi suggeriti

- Sostituire le icone placeholder in `public/icon-192.png` / `icon-512.png` con il logo reale.
- Generare automaticamente una thumbnail per ogni video caricato (oggi il feed usa il
  primo frame del video stesso).
- Aggiungere una funzione Supabase Edge per moderare i contenuti caricati.
- Quando l'app Android sarà pubblicata, aggiornare `ANDROID_APP_URL` in `DeviceGate.tsx`.
# Wave
