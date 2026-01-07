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
    const fileData = body.fileData; // e.g., "data:image/jpeg;base64,..."

    if (!fileData) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file data provided." }) };
    }

    // Extract Mime Type and Base64 Data
    const match = fileData.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid file format." }) };
    }

    const mimeType = match[1];
    const base64Data = match[2];

    // 3. Define Prompt
    const systemPrompt = require("./prompt");

    // 4. Loop through keys
    let lastError = null;
    let successResult = null;

    for (const key of keys) {
      try {
        console.log(`Attempting with key ending in ...${key.slice(-4)}`);
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp", // Updated to latest flash model which is good for vision
          generationConfig: {
            temperature: 0.0,
          }
        });

        const result = await model.generateContent([
          systemPrompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
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
