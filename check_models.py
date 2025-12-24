import google.generativeai as genai
import os
import toml

# Tentativo di recuperare la chiave da secrets.toml se esiste
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    try:
        secrets = toml.load(".streamlit/secrets.toml")
        api_key = secrets.get("GEMINI_API_KEY")
    except Exception:
        pass

if not api_key:
    print("ERRORE: API Key non trovata. Assicurati di averla impostata in .streamlit/secrets.toml o nelle variabili d'ambiente.")
else:
    genai.configure(api_key=api_key)
    print("Cerco i modelli disponibili...")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Errore durante listing modelli: {e}")
