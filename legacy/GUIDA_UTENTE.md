### 👤 File 2: `GUIDA_UTENTE.md`
*(Questa è la tua mappa del tesoro. Leggila passo passo).*

```markdown
# 🚀 GUIDA UTENTE: EASY CONTRACT (Zero to Cloud)

Questa guida ti porterà da zero alla pubblicazione di una Web App funzionante e gratuita per sempre.

---

## FASE 1: La Chiave Magica (API Key)
Per far funzionare il cervello dell'app, ti serve una chiave gratuita di Google.

1. Vai su [Google AI Studio](https://aistudio.google.com/).
2. Accedi con Google e clicca su **"Get API Key"** (in alto a sinistra).
3. Clicca **"Create API Key"**.
4. Copia il codice (inizia con `AIza...`) e incollalo temporaneamente in un blocco note.

---

## FASE 2: Setup Locale (Sul tuo PC o Project IDX)

1. **Crea la cartella del progetto.**
2. **Genera il codice:** Dai all'Agente AI il file `AGENT_PROMPT.md` e fagli creare `app.py` e `requirements.txt`.
3. **Installa le librerie:**
   Apri il terminale e scrivi:
   `pip install -r requirements.txt`

4. **Imposta la Chiave (Metodo Sicuro):**
   Streamlit usa un sistema speciale per le password.
   - Nella cartella del tuo progetto, crea una nuova cartella chiamata `.streamlit` (attento al punto iniziale!).
   - Dentro quella cartella, crea un file di testo chiamato `secrets.toml`.
   - Apri `secrets.toml` con un editor di testo e scrivi dentro:
     ```toml
     GEMINI_API_KEY = "incolla-qui-la-tua-chiave-AIza..."
     ```
   *(Nota: Questo file non deve MAI essere condiviso con nessuno).*

5. **Lancia l'App:**
   Scrivi nel terminale:
   `streamlit run app.py`

🎉 Se tutto va bene, si aprirà il browser con **Easy Contract**. Prova a caricare un PDF!

---

## FASE 3: Pubblicazione (Rendiamola Eterna)
Vuoi che l'app sia sempre online per farla usare agli amici?

1. **GitHub:**
   - Crea un account su GitHub.com.
   - Crea un "New Repository" chiamato `easy-contract`.
   - Carica lì SOLO i file `app.py` e `requirements.txt` (NON caricare mai `secrets.toml`!).

2. **Streamlit Cloud:**
   - Vai su [share.streamlit.io](https://share.streamlit.io/) e accedi con GitHub.
   - Clicca **"New App"**.
   - Seleziona il tuo repository `easy-contract`.
   - Clicca su **"Advanced Settings"** (o "Settings" dopo aver creato l'app).
   - Troverai una sezione **"Secrets"**.
   - Incolla lì dentro lo stesso contenuto del tuo file `secrets.toml`:
     ```toml
     GEMINI_API_KEY = "incolla-qui-la-tua-chiave-AIza..."
     ```
   - Clicca **Deploy**.

🌍 **Fatto!** Streamlit ti darà un link (es. `easy-contract.streamlit.app`) che sarà attivo per sempre, gratis.