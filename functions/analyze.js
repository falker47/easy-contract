const { GoogleGenAI, MediaResolution } = require("@google/genai");

const MODEL_NAMES = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
const MODEL_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 1_200;
const MAX_FILES = 12;
const MAX_BASE64_CHARS = 6_000_000;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function getApiKeys(env = process.env) {
  const list = (env.GEMINI_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (list.length > 0) return list;
  return env.GEMINI_API_KEY ? [env.GEMINI_API_KEY.trim()].filter(Boolean) : [];
}

function parseFileParts(body) {
  const rawFiles = Array.isArray(body.fileData)
    ? body.fileData
    : body.fileData
      ? [body.fileData]
      : [];

  if (rawFiles.length === 0) {
    const error = new Error("No file data provided.");
    error.statusCode = 400;
    throw error;
  }

  if (rawFiles.length > MAX_FILES) {
    const error = new Error(`Too many files. Maximum: ${MAX_FILES}.`);
    error.statusCode = 400;
    throw error;
  }

  let totalBase64Chars = 0;
  const parts = [];

  for (const fileData of rawFiles) {
    if (typeof fileData !== "string") {
      const error = new Error("Invalid file payload.");
      error.statusCode = 400;
      throw error;
    }

    const match = fileData.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      const error = new Error("Invalid file encoding.");
      error.statusCode = 400;
      throw error;
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2].replace(/\s/g, "");

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      const error = new Error(`Unsupported file type: ${mimeType}.`);
      error.statusCode = 415;
      throw error;
    }

    totalBase64Chars += base64Data.length;
    if (totalBase64Chars > MAX_BASE64_CHARS) {
      const error = new Error("Payload is too large.");
      error.statusCode = 413;
      throw error;
    }

    parts.push({
      inlineData: {
        data: base64Data,
        mimeType,
      },
    });
  }

  return parts;
}

function getUpstreamStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.code,
    error?.response?.status,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
      return parsed;
    }
  }

  return null;
}

function publicUpstreamError(error) {
  const status = getUpstreamStatus(error);
  const message = String(error?.message || "").toLowerCase();

  if (status === 429 || /quota|rate limit|resource exhausted/.test(message)) {
    return {
      statusCode: 429,
      message: "Il servizio AI ha raggiunto un limite temporaneo. Riprova tra poco.",
    };
  }

  if (status === 401 || status === 403 || /api key|permission|unauthor/.test(message)) {
    return {
      statusCode: 503,
      message: "Il servizio AI non è disponibile per un problema di configurazione.",
    };
  }

  if (status === 408 || status === 504 || /timeout|timed out/.test(message)) {
    return {
      statusCode: 504,
      message: "L'analisi AI ha impiegato troppo tempo. Riprova tra poco.",
    };
  }

  return {
    statusCode: 502,
    message: "L'analisi AI non è riuscita. Riprova tra poco.",
  };
}

async function generateWithKeys(parts, keys, systemPrompt, clientFactory) {
  let lastError;

  for (const key of keys) {
    const ai = clientFactory(key);

    for (const model of MODEL_NAMES) {
      const startedAt = Date.now();

      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { text: "Analizza il documento allegato seguendo esattamente il formato richiesto." },
              ...parts,
            ],
          }],
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: {
              thinkingLevel: model === "gemini-3.5-flash-lite" ? "minimal" : "low",
            },
            mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            httpOptions: {
              timeout: MODEL_TIMEOUT_MS,
            },
          },
        });

        if (!response || typeof response.text !== "string" || !response.text.trim()) {
          throw new Error("Gemini returned an empty response.");
        }

        return response.text;
      } catch (error) {
        lastError = error;
        const status = getUpstreamStatus(error);
        const elapsedMs = Date.now() - startedAt;
        const message = String(error?.message || "").toLowerCase();
        const timedOut = /timeout|timed out|deadline/.test(message) || elapsedMs >= MODEL_TIMEOUT_MS - 1000;

        console.warn(
          `Gemini request failed on ${model} after ${elapsedMs}ms (${status || "unknown"}).`
        );

        // Preserve enough headroom under Netlify's hard 60s synchronous limit.
        // Only try the fallback when the first failure was fast.
        if (timedOut || elapsedMs > 15_000 || status === 401 || status === 403 || status === 429) {
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini requests failed.");
}

async function analyzeRequest(event, options = {}) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const keys = getApiKeys(options.env || process.env);
  if (keys.length === 0) {
    console.error("Gemini API key is not configured.");
    return json(500, { error: "Servizio temporaneamente non disponibile." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Richiesta non valida." });
  }

  let parts;
  try {
    parts = parseFileParts(body);
  } catch (error) {
    return json(error.statusCode || 400, { error: error.message });
  }

  const systemPrompt = options.systemPrompt || require("./prompt");
  const clientFactory =
    options.clientFactory || ((key) => new GoogleGenAI({ apiKey: key }));

  try {
    const result = await generateWithKeys(
      parts,
      keys,
      systemPrompt,
      clientFactory
    );
    return json(200, { result });
  } catch (error) {
    console.error("Gemini analysis failed:", error?.message || error);
    const publicError = publicUpstreamError(error);
    return json(publicError.statusCode, { error: publicError.message });
  }
}

exports.handler = async (event) => analyzeRequest(event);
exports._test = {
  MODEL_NAMES,
  MODEL_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  getApiKeys,
  getUpstreamStatus,
  publicUpstreamError,
  parseFileParts,
  analyzeRequest,
};
