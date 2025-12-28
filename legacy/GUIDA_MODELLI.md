# Guida: Verificare i Modelli Gemini Disponibili

Se ricevi errori come `404 Not Found` relativi al modello (es. "gemini-1.5-flash not found"), è utile verificare quali modelli sono effettivamente abilitati per la tua API Key.

Ho preparato uno script Python per farlo facilmente.

## 1. Prerequisiti
Assicurati di aver impostato la tua API Key. 

- **Su Windows (PowerShell):**
  ```powershell
  $env:GEMINI_API_KEY="AIzaSy..."
  ```
- **Oppure** assicurati che sia nel file `.streamlit/secrets.toml` (lo script proverà a leggerla anche da lì se modificato, ma l'ambiente è più sicuro per test rapidi).

## 2. Eseguire lo script
Apri il terminale nella cartella del progetto ed esegui:

```bash
python check_models.py
```

## 3. Leggere l'Output
Lo script stampérà una lista di modelli, ad esempio:

```text
Modelli disponibili:
- models/gemini-2.5-flash
- models/gemini-2.5-pro
- models/gemini-2.0-flash-exp
- models/gemini-2.0-flash
- models/gemini-2.0-flash-001
- models/gemini-2.0-flash-lite-001
- models/gemini-2.0-flash-lite
- models/gemini-2.0-flash-lite-preview-02-05
- models/gemini-2.0-flash-lite-preview
- models/gemini-exp-1206
- models/gemini-2.5-flash-preview-tts
- models/gemini-2.5-pro-preview-tts
- models/gemma-3-1b-it
- models/gemma-3-4b-it
- models/gemma-3-12b-it
- models/gemma-3-27b-it
- models/gemma-3n-e4b-it
- models/gemma-3n-e2b-it
- models/gemini-flash-latest
- models/gemini-flash-lite-latest
- models/gemini-pro-latest
- models/gemini-2.5-flash-lite
- models/gemini-2.5-flash-image-preview
- models/gemini-2.5-flash-image
- models/gemini-2.5-flash-preview-09-2025
- models/gemini-2.5-flash-lite-preview-09-2025
- models/gemini-3-pro-preview
- models/gemini-3-flash-preview
- models/gemini-3-pro-image-preview
- models/nano-banana-pro-preview
- models/gemini-robotics-er-1.5-preview
- models/gemini-2.5-computer-use-preview-10-2025
- models/deep-research-pro-preview-12-2025
...
```

Copia il nome esatto del modello che vuoi usare (es. `gemini-2.5-flash`) e aggiornalo nel file `app.py` alla riga:
`model = genai.GenerativeModel("nome-del-modello")`
