const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configuration
const MODEL_NAME = "gemini-2.5-flash"; // Global setting for the model

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
    let fileDataArray = [];

    // Support both single file (legacy/simple) and array (multi-file)
    if (Array.isArray(body.fileData)) {
      fileDataArray = body.fileData;
    } else if (body.fileData) {
      fileDataArray = [body.fileData];
    }

    if (fileDataArray.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file data provided." }) };
    }

    // Prepare parts for Gemini
    const parts = [];

    // Add System Prompt first (as text)
    // Note: Gemini .generateContent accepts an array of parts. 
    // The system prompt is usually passed as a separate argument to getGenerativeModel or as part of the content.
    // In this specific legacy code, it was passed as the first element of the array.
    // We will keep that structure: [systemPrompt, ...imageParts]
    const systemPrompt = require("./prompt");
    parts.push(systemPrompt);

    for (const fileData of fileDataArray) {
      // Extract Mime Type and Base64 Data
      const match = fileData.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        console.warn("Invalid file format found, skipping one file.");
        continue;
      }

      const mimeType = match[1];
      const base64Data = match[2];

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    if (parts.length <= 1) { // Only system prompt
      return { statusCode: 400, body: JSON.stringify({ error: "No valid files found." }) };
    }

    // 4. Loop through keys
    let lastError = null;
    let successResult = null;

    for (const key of keys) {
      try {
        console.log(`Attempting with key ending in ...${key.slice(-4)}`);
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: MODEL_NAME,
          generationConfig: {
            temperature: 0.0,
          }
        });

        const result = await model.generateContent(parts);

        const response = await result.response;
        successResult = response.text();

        // If we get here, it worked!
        break;
      } catch (error) {
        console.warn(`Error with key ...${key.slice(-4)}: ${error.message}`);
        lastError = error;

        // Check if it's a quota error (429) or similar.
        if (error.message.includes("429") || error.status === 429) {
          continue;
        } else {
          // Try next key regardless, but keep error
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
      // Return the actual error message for debugging if not strictly a quota issue
      const msg = lastError ? lastError.message : "Unknown error";
      const isQuota = msg.includes("429") || msg.includes("quota");

      throw lastError || new Error("Unknown error, all keys failed.");
    }

  } catch (error) {
    console.error("All keys failed or fatal error:", error);

    // DEBUG MODE: Return full error details
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      // If it's a GoogleGenerativeAIError, it often has hidden props
      ...error
    };

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `DEBUG ERROR: ${error.message}`,
        details: errorDetails
      }),
    };
  }
};
