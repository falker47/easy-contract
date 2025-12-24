# Guida al Deployment su Streamlit Cloud

Questa guida ti spiega come pubblicare **Easy Contract** online in modo sicuro, proteggendo la tua API Key.

## 1. Sicurezza e Git
Ho creato per te un file `.gitignore` che **impedisce** a Git di caricare il file `.streamlit/secrets.toml`.
Questo significa che la tua chiave API locale rimarrà SOLO sul tuo computer.

> [!IMPORTANT]
> Quando carichi il codice su GitHub, caricherai solo `app.py`, `requirements.txt` e gli altri file `.md`. Il file con la chiave NON verrà caricato.

## 2. Caricare su GitHub
1. Crea una repository su GitHub.
2. Inizializza git e fai il push:
   ```bash
   git init
   git add .
   git commit -m "Initial release Easy Contract"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/NOME_REPO.git
   git push -u origin main
   ```

## 3. Deploy su Streamlit Cloud
1. Vai su [share.streamlit.io](https://share.streamlit.io/).
2. Clicca su **"New app"**.
3. Seleziona la repository GitHub che hai appena creato.
4. Seleziona il branch `main` e il file `app.py`.
5. **PRIMA DI CLICCARE DEPLOY**, clicca su **"Advanced settings"** (o "Manage app" dopo il deploy).

## 4. Impostare la Chiave Segreta (Secrets)
Questa è la parte fondamentale. Poiché non abbiamo caricato la chiave su GitHub, dobbiamo darla a Streamlit Cloud manualmente.

1. Nelle impostazioni dell'app su Streamlit Cloud, vai alla sezione **"Secrets"**.
2. Incolla il contenuto che hai nel tuo file locale `.streamlit/secrets.toml`:

```toml
GEMINI_API_KEY = "AIzaSy..."
```

3. Salva. Streamlit riavvierà l'app e leggerà la chiave (sicura) da lì.

## Fine!
La tua app sarà online, protetta e funzionante! 🚀
