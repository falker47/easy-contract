# ISTRUZIONI DI SVILUPPO: EASY CONTRACT (Web App)

## 1. OBIETTIVO DEL PROGETTO
Creare una Web App moderna chiamata **"Easy Contract"**.
L'app permette agli utenti di caricare contratti (PDF) e ottenere un'analisi legale semplificata usando l'AI.
Deve essere pronta per il deployment su **Streamlit Cloud**.

## 2. STACK TECNOLOGICO (Vincoli Rigidi)
- **Framework:** `streamlit`
- **AI Engine:** `google-generativeai`
- **Gestione PDF:** NESSUNA libreria di OCR o lettura testo (no `pypdf`, no `poppler`, no `pdf2image`). Useremo la capacità nativa di Gemini di leggere i byte del PDF.

## 3. STRUTTURA DEL CODICE (`app.py`)

### A. Configurazione e Segreti
- La API Key deve essere recuperata in modo sicuro.
- Il codice deve cercare la chiave in due posti (per compatibilità locale e cloud):
  1. `st.secrets["GEMINI_API_KEY"]` (Priorità per Streamlit Cloud).
  2. `os.getenv("GEMINI_API_KEY")` (Fallback per sviluppo locale).
- Se la chiave non viene trovata, mostra un `st.warning` amichevole che spiega dove inserirla.

### B. Interfaccia Utente (UI)
- `st.set_page_config`: Titolo "Easy Contract", icona "📝".
- **Header:** Titolo grande "Easy Contract" e sottotitolo "L'intelligenza artificiale che semplifica la burocrazia".
- **Sidebar:** Aggiungi una sidebar con info: "Come funziona: Carica il PDF, l'AI lo legge e ti dice se è sicuro."
- **Upload:** `st.file_uploader` che accetta solo file `.pdf`.

### C. Logica di Analisi (Native PDF Support)
Quando l'utente carica un file e preme "Analizza Contratto":
1. Mostra uno spinner di caricamento ("Analisi in corso...").
2. Prepara il blob del file:
   ```python
   document_blob = {
       "mime_type": "application/pdf",
       "data": uploaded_file.getvalue()
   }
3. Chiama model.generate_content([SYSTEM_PROMPT, document_blob]).
4. Stampa il risultato.

### D. Il Prompt di Sistema (Persona)
"Agisci come 'Easy Contract', un consulente legale esperto, chiaro e rassicurante. Il tuo compito è proteggere l'utente. Analizza il documento allegato e restituisci un report in Markdown con queste 4 sezioni esatte:

🛡️ Livello di Sicurezza
(Dai un voto da 1/10 a 10/10, dove 10 è 'Sicurissimo' e 1 è 'Pericoloso').

💡 In Breve
(Spiega in parole semplici di cosa tratta il contratto).

⚠️ Punti di Attenzione
(Elenca clausole vincolanti, penali, rinnovi automatici o costi nascosti. Se è tutto ok, scrivilo).

⚖️ Il Consiglio di Easy Contract
(Una frase conclusiva amichevole: 'Puoi firmare', 'Meglio rinegoziare', ecc)."

### E. OUTPUT RICHIESTO
Genera due file:

app.py (Il codice completo).
requirements.txt (Deve contenere solo: streamlit e google-generativeai).