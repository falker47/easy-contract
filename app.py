import streamlit as st
import google.generativeai as genai
import os
import re
from datetime import datetime

# --- A. Configurazione e Segreti ---
def get_api_keys():
    """
    Recupera una lista di API Keys da st.secrets o os.getenv.
    """
    keys = []
    
    # 1. Lista esplicita in secrets
    if "GEMINI_API_KEYS" in st.secrets:
        val = st.secrets["GEMINI_API_KEYS"]
        if isinstance(val, list):
            keys.extend(val)
        elif isinstance(val, str):
            keys.append(val)
            
    # 2. Chiave singola legacy
    if "GEMINI_API_KEY" in st.secrets:
        val = st.secrets["GEMINI_API_KEY"]
        if val not in keys:
            keys.append(val)
            
    # 3. Env var
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key and env_key not in keys:
        keys.append(env_key)

    return keys

api_keys = get_api_keys()

# --- B. Interfaccia Utente (UI) ---
st.set_page_config(page_title="Easy Contract", page_icon="assets/easycontract.ico", layout="centered")

# Custom CSS
st.markdown("""
<style>
    /* Nasconde il footer standard di Streamlit e l'header */
    #MainMenu {visibility: hidden !important;}
    footer {visibility: hidden !important;}
    header {visibility: hidden !important;}
    
    /* Nasconde la toolbar superiore (crown, user pic, menu) */
    [data-testid="stToolbar"] {visibility: hidden !important;}
    
    /* Nasconde eventuali decorazioni o bottoni deploy */
    .stDeployButton {display:none !important;}
    [data-testid="stDecoration"] {display:none !important;}
    [data-testid="stStatusWidget"] {visibility: hidden !important;}
    
    /* Nasconde elementi in basso a destra (Manage app, viewer badge) */
    .viewerBadge_container__1QSob {display: none !important;}
    
    /* Nasconde specifici elementi di gestione cloud */
    [data-testid="manage-app-button"] {display: none !important;}
    
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
        padding: 7px;
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
        padding-top: 0.5rem !important;
        padding-bottom: 80px;
    }
    
    /* Colore personalizzato richiesto per Titoli h2 e testo risposta */
    h2 {
        color: #b1edfc !important;
    }
    div[data-testid="stMarkdownContainer"] p, div[data-testid="stMarkdownContainer"] li {
        color: #b1edfc !important;
    }
</style>
""", unsafe_allow_html=True)

# Intestazione spostata nelle singole view

# ... (rest of the file remains unchanged until footer section)

# --- Footer ---
current_year = datetime.now().year
footer_html = f"""
<div class="custom-footer">
    <a href="https://falker47.github.io/Nexus-portfolio/" target="_blank">© {current_year} Maurizio Falconi - falker47</a>
</div>
"""
st.markdown(footer_html, unsafe_allow_html=True)

# Sidebar rimossa su richiesta utente
# with st.sidebar:
#     st.markdown("### 🔍 Come funziona")
#     st.markdown("""
#     1. **Carica** il contratto in PDF.
#     2. **Analizza** il documento con l'IA.
#     3. **Ottieni** un report su rischi e sicurezza.
#     """)
#     st.info("I dati vengono analizzati al volo e non vengono salvati.")

if not api_keys:
    st.warning("⚠️ **Attenzione:** API Key mancante. Inserisci `GEMINI_API_KEYS` (lista) o `GEMINI_API_KEY` in `.streamlit/secrets.toml`.")
    st.stop()


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
    st.markdown("### 📝 Risultati Analisi")
    
    # Layout: Score a sinistra, Bottone Chiudi a destra
    col_score, col_close = st.columns([4, 1])
    
    with col_score:
        if st.session_state["score_val"]:
            st.metric(label="🛡️ Score", value=f"{st.session_state['score_val']}/10")
            
    with col_close:
        # Bottone minimal "X"
        if st.button("✕", help="Chiudi e analizza un altro"):
            reset_app()
    
    st.markdown("---")
    st.markdown(st.session_state["analysis_text"])
    
    st.markdown("---")

else:
    # --- UPLOAD PAGE ---
    
    # Hero Section Centrata
    st.markdown("<h2 style='text-align: center; margin-bottom: 0px;'>Easy Contract 📝</h2>", unsafe_allow_html=True)
    st.markdown("<h5 style='text-align: center; font-weight:normal; color: #a3a8b8; margin-top: 5px;'>L'AI che ti protegge dalle insidie contrattuali</h5>", unsafe_allow_html=True)
    
    st.write("") # Spacer

    # Features 3 colonne
    # Features (Layout orizzontale forzato anche su mobile tramite Flexbox)
    st.markdown("""
    <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 10px;">
        <div style="flex: 1; text-align: center; padding: 10px; background-color: #262730; border-radius: 10px; color: #b1edfc;">
            ⚡<br><b>Analisi Rapida</b>
        </div>
        <div style="flex: 1; text-align: center; padding: 10px; background-color: #262730; border-radius: 10px; color: #b1edfc;">
            🛡️<br><b>Privacy Sicura</b>
        </div>
        <div style="flex: 1; text-align: center; padding: 10px; background-color: #262730; border-radius: 10px; color: #b1edfc;">
            ⚖️<br><b>Consigli Smart</b>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.write("") # Spacer
    st.write("") # Spacer

    # Upload Area
    st.markdown("##### 📂 Carica il tuo contratto")
    uploaded_file = st.file_uploader("Seleziona il file PDF", type=["pdf"], label_visibility="collapsed")

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

                    # LOGICA DI ROTAZIONE CHIAVI
                    response = None
                    last_exception = None
                    
                    for i, key in enumerate(api_keys):
                        try:
                            # Configura con la chiave corrente
                            genai.configure(api_key=key)
                            model = genai.GenerativeModel("gemini-2.5-flash")
                            
                            # Tenta la generazione
                            response = model.generate_content([system_prompt, document_blob])
                            
                            # Se arriva qui, successo! Esci dal loop
                            break
                        except Exception as e:
                            last_exception = e
                            error_msg = str(e)
                            
                            # Se è un errore di quota (429), prova la prossima chiave
                            if "429" in error_msg:
                                # Se non è l'ultima chiave, continua
                                if i < len(api_keys) - 1:
                                    continue
                            
                            # Se è un altro errore o sono finite le chiavi, lancia l'eccezione
                            raise e

                    if response:
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
                    error_msg = str(e)
                    if "429" in error_msg:
                        st.error("📉 **Quota Giornaliera Esaurita (su tutte le chiavi)**")
                        with st.expander("Dettagli errore"):
                            st.code(error_msg)
                    else:
                        st.error("🚫 Si è verificato un errore imprevisto.")
                        with st.expander("Mostra dettagli errore"):
                            st.write(error_msg)

# --- Footer ---
current_year = datetime.now().year
footer_html = f"""
<div class="custom-footer">
    <a href="https://falker47.github.io/Nexus-portfolio/" target="_blank">© {current_year} Maurizio Falconi - falker47</a>
</div>
"""
st.markdown(footer_html, unsafe_allow_html=True)
