# Easy Contract

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Netlify Status](https://api.netlify.com/api/v1/badges/bf6e6f8f-8348-4894-b589-1960844ee7cb/deploy-status)](https://app.netlify.com/projects/easy-contract/deploys)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

**Easy Contract** è uno strumento web per l'analisi automatica di contratti legali, alimentato dall'intelligenza artificiale di Google Gemini.

Il sistema analizza file PDF o foto di contratti caricati dall'utente e fornisce un report strutturato evidenziando:

- Punteggio di sicurezza 🛡️
- Sintesi dei vincoli principali 💡
- Punti di attenzione e rischi ⚠️
- Consigli operativi ⚖️

## 🚀 Tecnologie

Il progetto è costruito con un'architettura **Serverless** semplice e leggera:

- **Frontend**: HTML5, CSS3, Vanilla JavaScript. Nessun framework complesso.
- **Backend**: [Netlify Functions](https://docs.netlify.com/functions/overview/) (Node.js) per gestire le chiamate sicure alle API.
- **AI**: [Google Gemini API](https://ai.google.dev/) (modello `gemini-2.5-flash`).

## 🛠️ Prerequisiti

- [Node.js](https://nodejs.org/) (v18 o superiore)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install -g netlify-cli`)
- Una o più API Key di Google Gemini.

## 📦 Installazione

1.  **Clona la repository**:

    ```bash
    git clone https://github.com/falker47/easy-contract.git
    cd easy-contract
    ```

2.  **Installa le dipendenze**:
    ```bash
    npm install
    ```
    _Questo installerà `@google/generative-ai` necessario per le funzioni serverless._

## ⚙️ Configurazione

Il progetto richiede le API Key di Google Gemini per funzionare. Per la sicurezza, queste **non** devono mai essere esposte nel codice frontend, ma gestite come variabili d'ambiente.

### Sviluppo Locale

Crea un file `.env` nella root del progetto (o usa la gestione env di Netlify CLI):

```env
# Chiave singola
GEMINI_API_KEY=la_tua_chiave_api_qui

# OPPURE Lista di chiavi (per rotazione automatica e gestione quote)
GEMINI_API_KEYS=chiave_1,chiave_2,chiave_3
```

_Nota: La logica di backend supporta nativamente la rotazione delle chiavi se viene fornita la variabile `GEMINI_API_KEYS` separata da virgole._

## ▶️ Avvio in Locale

Per avviare l'applicazione in locale simulando l'ambiente serverless di Netlify:

```bash
netlify dev
```

Il sito sarà accessibile solitamente su `http://localhost:8888`. Le funzioni serverless saranno disponibili su `/.netlify/functions/analyze`.

## 🚢 Deployment su Netlify

Il progetto è pre-configurato per il deployment su Netlify grazie al file `netlify.toml`.

1.  Collega la repository al tuo account Netlify.
2.  Nelle impostazioni del sito su Netlify, vai su **Site configuration > Environment variables**.
3.  Aggiungi le variabili d'ambiente `GEMINI_API_KEY` (o `GEMINI_API_KEYS`).
4.  Esegui il deploy.

## 📂 Struttura del Progetto

```
easy-contract/
├── functions/          # Funzioni Serverless (Backend)
│   ├── analyze.js      # Logica principale (proxy verso Gemini)
│   └── prompt.js       # System prompt per l'analisi legale
├── index.html          # Interfaccia utente
├── style.css           # Stili
├── script.js           # Logica Frontend
├── netlify.toml        # Configurazione Netlify
└── package.json        # Dipendenze Node.js
```

## 🔒 Sicurezza

- **No Upload**: I file (PDF o Immagini) vengono processati al volo convertendoli in Base64 e inviati a Gemini. Il codice attuale **non** salva i file permanentemente su disco o storage cloud.
- **API Key Protection**: Le chiavi API risiedono solo sul server (Netlify Functions) e non sono mai esposte al client.

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT.
