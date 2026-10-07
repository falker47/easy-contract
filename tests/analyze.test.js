const test = require("node:test");
const assert = require("node:assert/strict");

const { _test } = require("../functions/analyze");

const tinyPdf = "data:application/pdf;base64,SGVsbG8=";

test("rejects malformed JSON without leaking internals", async () => {
  const response = await _test.analyzeRequest(
    { httpMethod: "POST", body: "{" },
    { env: { GEMINI_API_KEY: "secret-key-1234" } }
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), { error: "Richiesta non valida." });
  assert.doesNotMatch(response.body, /1234|stack|trace/i);
});

test("rejects unsupported MIME types before calling Gemini", async () => {
  const response = await _test.analyzeRequest(
    {
      httpMethod: "POST",
      body: JSON.stringify({
        fileData: ["data:text/plain;base64,SGVsbG8="],
      }),
    },
    {
      env: { GEMINI_API_KEY: "secret-key-1234" },
      clientFactory: () => {
        throw new Error("Gemini should not be called");
      },
    }
  );

  assert.equal(response.statusCode, 415);
});

test("sanitizes upstream errors and never returns key suffixes or stack traces", async () => {
  const response = await _test.analyzeRequest(
    {
      httpMethod: "POST",
      body: JSON.stringify({ fileData: tinyPdf }),
    },
    {
      env: { GEMINI_API_KEYS: "first-secret-1111,second-secret-2222" },
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            const err = new Error("upstream failure for secret 2222");
            err.stack = "STACK_WITH_SECRET_2222";
            throw err;
          },
        },
      }),
    }
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(JSON.parse(response.body), {
    error:
      "L'analisi AI non è riuscita. Riprova tra poco o usa un documento più leggibile.",
  });
  assert.doesNotMatch(response.body, /1111|2222|STACK|upstream/i);
});

test("returns model text on success", async () => {
  const response = await _test.analyzeRequest(
    {
      httpMethod: "POST",
      body: JSON.stringify({ fileData: tinyPdf }),
    },
    {
      env: { GEMINI_API_KEY: "test-key" },
      systemPrompt: "test prompt",
      clientFactory: () => ({
        models: {
          generateContent: async ({ model, config, contents }) => {
            assert.equal(model, "gemini-3.5-flash-lite");
            assert.equal(config.thinkingConfig.thinkingLevel, "minimal");
            assert.equal(config.maxOutputTokens, 1200);
            assert.equal(config.httpOptions.timeout, 45000);
            assert.ok(config.mediaResolution);
            assert.equal(contents[0].parts[0].text, "Analizza il documento allegato seguendo esattamente il formato richiesto.");
            return { text: "ok" };
          },
        },
      }),
    }
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { result: "ok" });
});


test("falls back to the previous stable Gemini model when the primary model fails", async () => {
  const attemptedModels = [];

  const response = await _test.analyzeRequest(
    {
      httpMethod: "POST",
      body: JSON.stringify({ fileData: tinyPdf }),
    },
    {
      env: { GEMINI_API_KEY: "test-key" },
      systemPrompt: "test prompt",
      clientFactory: () => ({
        models: {
          generateContent: async ({ model }) => {
            attemptedModels.push(model);
            if (model === "gemini-3.5-flash-lite") {
              const error = new Error("temporary upstream failure");
              error.status = 503;
              throw error;
            }
            return { text: "fallback ok" };
          },
        },
      }),
    }
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { result: "fallback ok" });
  assert.deepEqual(attemptedModels, ["gemini-3.5-flash-lite", "gemini-3.6-flash"]);
});

test("maps Gemini quota errors to a safe 429 response", async () => {
  const response = await _test.analyzeRequest(
    {
      httpMethod: "POST",
      body: JSON.stringify({ fileData: tinyPdf }),
    },
    {
      env: { GEMINI_API_KEY: "test-key" },
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            const error = new Error("RESOURCE_EXHAUSTED quota");
            error.status = 429;
            throw error;
          },
        },
      }),
    }
  );

  assert.equal(response.statusCode, 429);
  assert.deepEqual(JSON.parse(response.body), {
    error: "Il servizio AI ha raggiunto un limite temporaneo. Riprova tra poco.",
  });
});


test("does not start a fallback after a slow timeout-like failure", async () => {
  const attemptedModels = [];

  const originalNow = Date.now;
  let now = 0;
  Date.now = () => {
    now += 46_000;
    return now;
  };

  try {
    const response = await _test.analyzeRequest(
      {
        httpMethod: "POST",
        body: JSON.stringify({ fileData: tinyPdf }),
      },
      {
        env: { GEMINI_API_KEY: "test-key" },
        systemPrompt: "test prompt",
        clientFactory: () => ({
          models: {
            generateContent: async ({ model }) => {
              attemptedModels.push(model);
              throw new Error("timeout");
            },
          },
        }),
      }
    );

    assert.equal(response.statusCode, 504);
    assert.deepEqual(attemptedModels, ["gemini-3.5-flash-lite"]);
  } finally {
    Date.now = originalNow;
  }
});
