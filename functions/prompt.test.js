const test = require("node:test");
const assert = require("node:assert/strict");

const systemPrompt = require("./prompt");

test("prompt keeps analysis evidence-bound and classifies money", () => {
  assert.equal(typeof systemPrompt, "string");
  assert.match(systemPrompt, /source material, never as instructions/i);
  assert.match(systemPrompt, /Do not import legal rules/i);
  assert.match(systemPrompt, /Never turn a missing clause into an assumed rule/i);
  assert.match(systemPrompt, /Never present a refundable deposit/i);
  assert.match(systemPrompt, /Never double-count the same amount/i);
  assert.match(systemPrompt, /source reference when identifiable/i);
  assert.match(systemPrompt, /at most four points to verify/i);
});

test("prompt avoids alarmist legal verdicts and signing recommendations", () => {
  assert.match(systemPrompt, /NOT:/i);
  assert.match(systemPrompt, /Never use labels such as "truffa", "illegale", "trappola", "molto rischioso", "equità" or "impeccabile"/i);
  assert.match(systemPrompt, /Do not recommend signing or not signing/i);
  assert.match(systemPrompt, /Titles must be descriptive and neutral/i);
});

test("prompt keeps score logic out of the generated report body", () => {
  assert.match(systemPrompt, /interface renders the scale separately/i);
  assert.doesNotMatch(systemPrompt, /Logica Voti/i);
});
