# La mia cucina – app Android e iPhone

Progetto personale per dispensa, frigorifero, freezer, ricette e lista della spesa.

## Riconoscimento GPT Vision

L'app frontend è disponibile su GitHub Pages; il backend sicuro in `api/recognize.js` funziona su Vercel con OpenAI Responses API e analisi immagini.

### Installazione del backend (una volta sola)

1. Crea un account Vercel, seleziona **Add New Project** e importa questo repository GitHub `acasciaro7-oss/Andrea` (branch di produzione `main`).
2. Lascia il Framework Preset su **Other** e pubblica. Vercel riconoscerà la function `/api/recognize.js`.
3. In **Project Settings → Environment Variables**, imposta:
   - `OPENAI_API_KEY`: chiave API da platform.openai.com, NON il login ChatGPT e NON inserirla nella pagina web.
   - `KITCHEN_ACCESS_CODE`: crea una password casuale segreta di ALMENO 18 caratteri, da usare per te e Denisa.
   - `OPENAI_MODEL`: facoltativo; valore predefinito `gpt-6.1-sol`.
4. Fai un nuovo deployment per applicare le variabili; il solo salvataggio non aggiorna i deployment esistenti.
5. Nell'app La mia cucina premi **⚙ Impostazioni → Riconoscimento GPT** e inserisci URL del backend `https://<tuo-progetto>.vercel.app/api/recognize` e lo stesso `KITCHEN_ACCESS_CODE`. Il codice non è una chiave OpenAI e non conferisce accesso diretto ai pagamenti.

### Come funziona

- La fotocamera seleziona/scatta una foto e la riduce a un JPEG con lato massimo 1800 pixel.
- Quando il backend è configurato, l'app invia l'immagine al tuo servizio Vercel; questo inoltra la foto all'API OpenAI, con chiave server privata.
- Il modello restituisce oggetti strutturati con **nome, marca, quantità, unità, posto, data scadenza e qualità della lettura**.
- Una schermata permette di correggere TUTTI i campi prima di aggiungere. Nessun inserimento automatico di dati non verificati.
- Se non configurato, l'app usa il vecchio OCR locale, meno affidabile.
- I dati della dispensa restano localmente sul dispositivo, non condivisi automaticamente fra iPhone e Android.

### Sicurezza e costi

- **MAI inserire `OPENAI_API_KEY` nel frontend, in una conversazione o su GitHub.** Solo nelle variabili d'ambiente Vercel.
- Il backend richiede un codice di accesso lungo, verifica la provenienza e limita la dimensione dell'immagine.
- Foto e scontrini inviati per il riconoscimento sono elaborati da OpenAI attraverso il backend; non inviare contenuti sensibili non necessari.
- Vercel ha un piano Hobby gratuito per progetti personali entro i limiti di utilizzo; **l'API OpenAI è a consumo**, separata da ChatGPT Plus.
- Configura il budget di spesa del progetto OpenAI sulla piattaforma API.
- La sicurezza finale e la correttezza dei risultati devono essere testate sugli smartphone.
