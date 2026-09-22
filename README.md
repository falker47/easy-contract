# Easy Contract

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![Google GenAI](https://img.shields.io/badge/AI-Google%20GenAI-4285F4?logo=google&logoColor=white)
[![Netlify Status](https://api.netlify.com/api/v1/badges/bf6e6f8f-8348-4894-b589-1960844ee7cb/deploy-status)](https://app.netlify.com/projects/easy-contract/deploys)

**Easy Contract** is a small serverless experiment for turning a contract PDF or a set of page images into a structured, plain-language reading aid.

It is **not a legal-advice service** and the generated analysis can be incomplete or wrong. The output is designed to highlight clauses, costs, dates and questions worth checking—not to decide whether a clause is legally valid or whether a user should sign.

## Current stack

- **Frontend:** HTML, CSS and vanilla JavaScript.
- **Backend:** Netlify Functions on Node.js 20.
- **AI SDK:** `@google/genai` 2.23.0.
- **Model:** `gemini-3.6-flash`.
- **Rendering:** Marked + DOMPurify for sanitized report HTML.
- **Export:** browser print flow for PDF output.

The project migrated away from the legacy `@google/generative-ai` SDK. Google currently recommends the Google GenAI SDK, and `gemini-3.6-flash` is the documented replacement for the `gemini-2.5-flash` line.

## What the app does

1. Accepts one PDF or multiple supported images.
2. Converts the selected files to data URLs in the browser.
3. Sends the document payload to the Netlify Function.
4. The function validates method, payload shape, MIME type and total encoded size.
5. The function forwards the validated document content to the configured Gemini API.
6. The returned Markdown is sanitized before being rendered in the browser.
7. The user can print/export the visible report as PDF.

## Data handling and privacy boundary

The application code does **not** persist uploaded documents to its own database or file storage.

However, the files are **sent to Google's Gemini API for processing**. Therefore, “not stored by Easy Contract” does not mean “never leaves the browser” or “never reaches a third-party processor.” Users should avoid uploading material they are not authorized to send to an external AI service and should consult the applicable Google API terms/data-handling settings for their deployment.

API keys stay in Netlify server-side environment variables and are not returned to the browser. Server errors are intentionally sanitized so stack traces, upstream exception details and key suffixes are not exposed to clients.

## Local setup

Requirements:
- Node.js 20+;
- Netlify CLI;
- a Gemini API key.

```bash
git clone https://github.com/falker47/easy-contract.git
cd easy-contract
npm install
cp .env.example .env
```

Configure either:

```env
GEMINI_API_KEY=your_key_here
```

or a comma-separated fallback list:

```env
GEMINI_API_KEYS=key_one,key_two
```

Then run:

```bash
netlify dev
```

## Checks

```bash
npm run check
npm test
```

The GitHub Actions workflow runs both commands on Node.js 20.

The tests cover the serverless request boundary, including malformed JSON, unsupported MIME types, successful mocked generation and sanitization of upstream errors so secrets/debug internals are not returned to the client.

## Repository structure

```text
easy-contract/
├── functions/
│   ├── analyze.js
│   ├── analyze.test.js
│   └── prompt.js
├── assets/
├── index.html
├── style.css
├── script.js
├── netlify.toml
├── package.json
└── .env.example
```

## Operational limits

- The browser currently enforces an approximate 4.5 MB aggregate source-file limit before Base64 expansion.
- The backend independently caps encoded payload size and the number of files.
- AI extraction can miss text, misread scans, make arithmetic mistakes or misunderstand legal language.
- The “attention index” in the report is an AI-generated heuristic, not a legal-risk score or prediction.
- Questions of validity, enforceability, jurisdiction or material legal consequences require professional review.

## License status

No project-wide `LICENSE` file is currently present. The previous README displayed an MIT badge and stated that the repository was MIT-licensed without the corresponding license text; that unsupported claim has been removed.
