const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 1. Get API Keys (Support lists or single key)
    let keys = [];

    // Check for comma-separated list
    if (process.env.GEMINI_API_KEYS) {
      keys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
    }
    // Fallback to single key if list is empty
    if (keys.length === 0 && process.env.GEMINI_API_KEY) {
      keys.push(process.env.GEMINI_API_KEY);
    }

    if (keys.length === 0) {
      console.error("No API Keys found in environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server Configuration Error: API Key missing." })
      };
    }

    // 2. Parse Body
    const body = JSON.parse(event.body);
    const fileData = body.fileData;

    if (!fileData) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file data provided." }) };
    }

    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "");

    // 3. Define Prompt
    const systemPrompt = `
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
`;

    // 4. Loop through keys
    let lastError = null;
    let successResult = null;

    for (const key of keys) {
      try {
        console.log(`Attempting with key ending in ...${key.slice(-4)}`);
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
          systemPrompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf",
            },
          },
        ]);

        const response = await result.response;
        successResult = response.text();

        // If we get here, it worked!
        break;
      } catch (error) {
        console.warn(`Error with key ...${key.slice(-4)}: ${error.message}`);
        lastError = error;

        // Check if it's a quota error (429) or similar.
        // If so, continue to next key. 
        // If not, we might still want to try next key just in case, or fail?
        // Usually 429 is the main reason to rotate.
        if (error.message.includes("429") || error.status === 429) {
          continue;
        } else {
          // If it's a different error (e.g. invalid key, bad request), 
          // we might still want to try others if it was an auth error, 
          // but let's assume we try others for robustness.
          continue;
        }
      }
    }

    if (successResult) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: successResult }),
      };
    } else {
      throw lastError || new Error("Unknown error, all keys failed.");
    }

  } catch (error) {
    console.error("All keys failed or fatal error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Quota esaurita su tutte le chiavi o errore del server. Riprova più tardi." }),
    };
  }
};
