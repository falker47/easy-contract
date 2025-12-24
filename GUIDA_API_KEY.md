# Come ottenere una API Key gratuita per Google Gemini

Per far funzionare **Easy Contract**, hai bisogno di una chiave API di Google Gemini. Ecco come ottenerla gratuitamente:

## 1. Vai su Google AI Studio
Apri il seguente link: [Google AI Studio - Get API Key](https://aistudio.google.com/app/apikey)

## 2. Crea la Chiave
1. Clicca sul pulsante **"Create API Key"**.
2. Se ti viene chiesto, seleziona un progetto Google Cloud esistente o clicca su **"Create API key in new project"**.
3. Copia la chiave generata (inizia solitamente con `AIza...`).

## 3. Configura la Chiave nel Progetto

Ci sono due modi per inserire la chiave. Il metodo consigliato per Streamlit è usare i "Secrets".

### Metodo A: Streamlit Secrets (Consigliato per Locale e Cloud)
1. Nella cartella del tuo progetto, crea una cartella chiamata `.streamlit` (se non esiste).
2. Dentro quella cartella, crea un file chiamato `secrets.toml`.
3. Apri il file con un editor di testo e incolla la tua chiave in questo formato:

```toml
GEMINI_API_KEY = "incolla_qui_la_tua_chiave"
```

### Metodo B: Variabili d'Ambiente (Alternativo)
Puoi impostare una variabile d'ambiente nel tuo sistema operativo:
- **Nome:** `GEMINI_API_KEY`
- **Valore:** La tua chiave API.

## 4. Riavvia l'App
Se l'app è già in esecuzione, aggiorna la pagina. Dovrebbe ora funzionare e permetterti di analizzare i contratti!
