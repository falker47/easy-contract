const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configuration
const MODEL_NAME = "gemini-2.5-flash"; // Global setting for the model

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Trace execution -> Declared OUTSIDE try block to be accessible in catch
  const logs = [];

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

    // Load System Prompt
    const systemPrompt = require("./prompt");
    // Note: System Prompt is passed to getGenerativeModel systemInstruction

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

    if (parts.length === 0) { // Check if we have files
      return { statusCode: 400, body: JSON.stringify({ error: "No valid files found." }) };
    }

    // 4. Loop through keys
    let lastError = null;
    let successResult = null;

    logs.push(`Found ${keys.length} keys.`);

    for (const [index, key] of keys.entries()) {
      try {
        logs.push(`Attempting key ${index} (ending in ...${key.slice(-4)})`);
        console.log(`Attempting with key ending in ...${key.slice(-4)}`);
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: MODEL_NAME,
          systemInstruction: systemPrompt, // Correct way to pass system prompt
          generationConfig: {
            temperature: 0.0,
          }
        });

        logs.push("Generating content...");
        const result = await model.generateContent(parts);

        logs.push("Awaiting response...");
        const response = await result.response;
        successResult = response.text();
        logs.push("Success!");

        // If we get here, it worked!
        break;
      } catch (error) {
        logs.push(`Error with key ${index}: ${error.message}`);
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

      // If lastError is null here, it means the loop finished but successResult is null AND lastError is null.
      if (!lastError) logs.push("lastError was null after loop!?");

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
        details: errorDetails,
        trace: logs // Return the execution trace
      }),
    };
  }
};
