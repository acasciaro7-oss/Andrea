# La mia cucina – gratuita

Applicazione per tenere sotto controllo la dispensa, il frigorifero e il freezer, gestire la lista della spesa e trovare idee per pranzo e cena.

**Versione iPhone:** https://acasciaro7-oss.github.io/Andrea/

## Riconoscimento foto senza costi

- OCR gratuito con [Tesseract.js](https://github.com/naptha/tesseract.js), eseguito nel browser o nell'app Android.
- Elaborazione migliorata per scritte chiare, arancioni o di dimensioni diverse.
- Riconoscimento prudente del nome prodotto, marchio, conservazione e, **solo se leggibile**, data di scadenza.
- Scansione codice a barre dove supportata e ricerca in Open Food Facts.
- Revisione manuale dei risultati prima di salvare un alimento.
- Nessuna chiave API OpenAI, nessun abbonamento o servizio AI a pagamento richiesto.

**Limiti:** OCR gratuito non ha la capacità di ragionare sulle immagini di un modello multimodale. Date piccole o stampate a puntini, foto mosse e scontrini difficili potrebbero richiedere correzioni manuali. Il motore OCR può richiedere connessione per il primo caricamento. I dati rimangono in locale sul dispositivo.

### Installazione iPhone
Da Safari apri il link dell'app → Condividi → Aggiungi alla schermata Home.

### Installazione Android
L'APK viene compilato nel repository privato `acasciaro7-oss/App-cucina`. Scarica l'artifact dell'ultima GitHub Action completata.

### Protezione dei dati
La dispensa di ciascun dispositivo rimane separata. Per non perdere i dati, usa Impostazioni → Esporta backup prima di cambiare o disinstallare l'app.
