const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 1. Get Secret Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables.");
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Server Configuration Error: API Key missing." }) 
      };
    }

    // 2. Parse Body
    const body = JSON.parse(event.body);
    const fileData = body.fileData; // Expecting Base64 string (without data:application/pdf;base64 prefix ideally, or we strip it)

    if (!fileData) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file data provided." }) };
    }

    // Strip header if present (data:application/pdf;base64,...)
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "");

    // 3. Setup Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash as it is fast and efficient for this task
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Define Prompt (Copied from original app.py)
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

    // 5. Call API
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
    const text = response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ result: text }),
    };

  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
