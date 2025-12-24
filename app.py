import streamlit as st
import google.generativeai as genai
import os
import re
from datetime import datetime

# --- A. Configurazione e Segreti ---
def get_api_key():
    """Recupera la API Key da st.secrets o os.getenv."""
    if "GEMINI_API_KEY" in st.secrets:
        return st.secrets["GEMINI_API_KEY"]
    return os.getenv("GEMINI_API_KEY")

api_key = get_api_key()

# --- B. Interfaccia Utente (UI) ---
st.set_page_config(page_title="Easy Contract", page_icon="📝", layout="centered")

# Custom CSS
st.markdown("""
<style>
    /* Nasconde il footer standard di Streamlit e l'header */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Stile personalizzato per il bottone */
    .stButton > button {
        width: auto;
        min-width: 200px;
        background-color: #02616e;
        color: white;
        font-weight: bold;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        border: none;
        float: right;
    }
    .stButton > button:hover {
        background-color: #058c9e;
        color: white;
    }
    
    /* Stile per il footer personalizzato */
    .custom-footer {
        position: fixed;
        left: 0;
        bottom: 0;
        width: 100%;
        background-color: #0E1117; 
        color: #FAFAFA;
        text-align: center;
        padding: 10px;
        font-size: 14px;
        border-top: 1px solid #262730;
        z-index: 1000;
    }
    .custom-footer a {
        color: #FAFAFA;
        text-decoration: normal;
        font-weight: normal;
    }
    .custom-footer a:hover {
        color: #17e4ff;
        text-decoration: none;
    }
    
    /* Riduce margini del contenuto principale */
    .block-container {
        padding-top: 2rem !important;
        padding-bottom: 80px;
    }
</style>
""", unsafe_allow_html=True)

# Intestazione compatta
st.markdown("## Easy Contract 📝\n**L'IA che ti protegge dalle insidie contrattuali**")

# ... (rest of the file remains unchanged until footer section)

# --- Footer ---
current_year = datetime.now().year
footer_html = f"""
<div class="custom-footer">
    <a href="https://falker47.github.io/Nexus-portfolio/" target="_blank">© {current_year} Maurizio Falconi - falker47</a>
</div>
"""
st.markdown(footer_html, unsafe_allow_html=True)

with st.sidebar:
    st.markdown("### 🔍 Come funziona")
    st.markdown("""
    1. **Carica** il contratto in PDF.
    2. **Analizza** il documento con l'IA.
    3. **Ottieni** un report su rischi e sicurezza.
    """)
    st.info("I dati vengono analizzati al volo e non vengono salvati.")

if not api_key:
    st.warning("⚠️ **Attenzione:** API Key mancante. Inserisci `GEMINI_API_KEY` in `.streamlit/secrets.toml` o nelle variabili d'ambiente.")
    st.stop()

genai.configure(api_key=api_key)

# --- Session State Init ---
if "show_results" not in st.session_state:
    st.session_state["show_results"] = False
if "analysis_text" not in st.session_state:
    st.session_state["analysis_text"] = ""
if "score_val" not in st.session_state:
    st.session_state["score_val"] = None

def reset_app():
    st.session_state["show_results"] = False
    st.session_state["analysis_text"] = ""
    st.session_state["score_val"] = None
    st.rerun()

# --- View Logic ---

if st.session_state["show_results"]:
    # --- RISULTATI ---
    
    # Bottone Indietro (in alto o in fondo? Mettiamolo in alto per navigabilità o usiamo colonne)
    # L'utente ha chiesto un bottone per tornare.
    
    if st.session_state["score_val"]:
        st.metric(label="🛡️ Livello di Sicurezza", value=f"{st.session_state['score_val']}/10")
    
    st.markdown("---")
    st.markdown(st.session_state["analysis_text"])
    
    st.markdown("---")
    if st.button("⬅️ Analizza un altro contratto"):
        reset_app()

else:
    # --- UPLOAD PAGE ---
    
    # Rimosso header "Carica il documento" per compattezza
    uploaded_file = st.file_uploader("Trascina qui il tuo contratto (PDF)", type=["pdf"])

    # --- C. Logica di Analisi ---
    if uploaded_file is not None:
        # Colonne per allineare il bottone a destra
        col_spacer, col_btn = st.columns([2, 1])
        with col_btn:
            analyze_clicked = st.button("Analizza Contratto")
        
        if analyze_clicked:
            with st.spinner("🕵️‍♂️ Analisi del contratto in corso..."):
                try:
                    document_blob = {
                        "mime_type": "application/pdf",
                        "data": uploaded_file.getvalue()
                    }

                    system_prompt = """
Agisci come 'Easy Contract', un consulente legale esperto focalizzato sulla massima sintesi e protezione dell'utente.
Analizza il documento allegato. Il tuo obiettivo è trovare le insidie (costi nascosti, vincoli forti, penali) ed esporle in modo telegrafico.

Genera un report in Markdown seguendo rigorosamente queste 4 sezioni.
IMPORTANTE: Per le sezioni "In Breve" e "Il Consiglio", vai SEMPRE a capo dopo il titolo.

🛡️ Score:
(Restituisci SOLO il voto numerico da 1/10 a 10/10 e un aggettivo tra parentesi. Esempio: "8/10 (Sicuro)". NON aggiungere nessuna spiegazione o frase sotto).

💡 In Breve:
(Vai a Capo. Max 1 frase. Spiega l'oggetto del contratto e il valore economico principale. Esempi: "Contratto di locazione 4+4 per monolocale a Parma, canone €500/mese", "Contratto di telefonia mobile 24 mesi con vincolo a €20/mese", "Contratto di lavoro a tempo indeterminato, RAL 30k").

⚠️ Punti di Attenzione
(Elenco puntato delle criticità. Sii spietato e sintetico. Max 20 parole per punto.
- NON spiegare definizioni legali (es. cos'è una caparra).
- Scrivi SOLO: Oggetto del rischio -> Costo/Vincolo specifico.
- Cerca: Penali, Tacito rinnovo, Provvigioni agenzia, Deposito cauzionale alto, Clausole di recesso restrittive).

⚖️ Il Consiglio di Easy Contract:
(Vai a Capo. Una sola frase diretta e operativa. Esempi: "Firma pure, ma verifica prima le spese condominiali reali con l'amministratore", "Firma solo se sei sicuro di mantenere il servizio per 2 anni", "Chiedi di rimuovere la clausola di non concorrenza post-contrattuale").
"""

                    model = genai.GenerativeModel("gemini-2.5-flash")
                    response = model.generate_content([system_prompt, document_blob])
                    text = response.text
                    
                    # --- Smart Rendering & Saving ---
                    score_match = re.search(r"(\d{1,2})/10", text)
                    if score_match:
                        score_val = score_match.group(1)
                        st.session_state["score_val"] = score_val
                        
                        # Rimuovi la sezione Security dal testo
                        split_marker = "💡 In Breve"
                        if split_marker in text:
                            text = split_marker + text.split(split_marker, 1)[1]
                    else:
                         st.session_state["score_val"] = None
                    
                    st.session_state["analysis_text"] = text
                    st.session_state["show_results"] = True
                    st.rerun()

                except Exception as e:
                    st.error(f"Si è verificato un errore durante l'analisi: {e}")

# --- Footer ---
current_year = datetime.now().year
footer_html = f"""
<div class="custom-footer">
    <a href="https://falker47.github.io/Nexus-portfolio/" target="_blank">© {current_year} Maurizio Falconi - falker47</a>
</div>
"""
st.markdown(footer_html, unsafe_allow_html=True)
