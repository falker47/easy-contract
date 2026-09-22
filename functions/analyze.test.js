const test = require("node:test");
const assert = require("node:assert/strict");

const { _test } = require("./analyze");

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
            const err = new Error("quota failure for secret 2222");
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
  assert.doesNotMatch(response.body, /1111|2222|STACK|quota/i);
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
          generateContent: async ({ model }) => {
            assert.equal(model, "gemini-3.6-flash");
            return { text: "ok" };
          },
        },
      }),
    }
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { result: "ok" });
});
