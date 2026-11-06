# Easy Contract

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![Google GenAI](https://img.shields.io/badge/AI-Google%20GenAI-4285F4?logo=google&logoColor=white)
[![Netlify Status](https://api.netlify.com/api/v1/badges/bf6e6f8f-8348-4894-b589-1960844ee7cb/deploy-status)](https://app.netlify.com/projects/easy-contract/deploys)

**Easy Contract** is a small serverless web app that helps people understand the practical details of a contract, proposal, agreement or terms-and-conditions document.

Upload a PDF or images of its pages to receive a structured report in Italian. The report highlights costs, deadlines, obligations, ambiguous clauses and questions worth clarifying. It is intended as a reading aid: a way to prepare questions and check important details against the original document.

**Easy Contract is not a legal-advice service.** Its AI-generated analysis may be incomplete or incorrect. It cannot determine whether a clause is legally valid, enforceable or appropriate for a particular situation, and it does not decide whether someone should sign.

**Try the app:** https://easy-contract.netlify.app/

## Current stack

- **Frontend:** HTML, CSS and vanilla JavaScript.
- **Backend:** Netlify Functions, with Node.js 20 configured for the Netlify build and GitHub CI.
- **AI SDK:** `@google/genai` 2.23.0, pinned in `package.json`.
- **AI models:** `gemini-3.5-flash-lite` first, with `gemini-3.6-flash` as a fallback.
- **Report rendering:** Marked and DOMPurify, loaded in the browser from CDN scripts.
- **PDF export:** the browser's native print dialog, with dedicated print styles.

The serverless implementation uses the Google GenAI SDK rather than the former `@google/generative-ai` package.

The model names and their order are configured in `functions/analyze.js`. For each configured API key, the backend attempts the primary model and may try the fallback when a request fails. Authentication and quota errors instead move processing to the next available key.

Both model identifiers appear in [Google's Gemini model documentation](https://ai.google.dev/gemini-api/docs/models). Their availability to a particular deployment still depends on its API access, configuration and quotas. The automated tests mock model responses; they do not establish that live Gemini requests succeed.

## What the app does

1. **Accepts a document.** The interface supports a single PDF or a collection of page images in JPEG, PNG, WebP or HEIC format.
2. **Prepares the upload in the browser.** JavaScript reads the selected files as Base64 data URLs using `FileReader`.
3. **Calls the serverless backend.** The browser sends the encoded document in a JSON request to `/.netlify/functions/analyze`.
4. **Validates the request.** The Netlify Function checks the HTTP method, JSON input, declared MIME types, file count and aggregate Base64 length.
5. **Requests an AI analysis.** The backend passes the document content and the analysis instructions in `functions/prompt.js` to the configured Gemini API.
6. **Renders the report.** The model's Markdown response is converted to HTML using Marked and sanitized with DOMPurify before being inserted into the page.
7. **Offers PDF export.** The user can open the browser's print dialog and choose a PDF destination.

The application does not perform a separate, deterministic extraction or legal validation of every clause. Document interpretation and report generation depend on the AI model.

### Understanding the report

The prompt asks Gemini to produce four main sections:

- **In sintesi:** the document's purpose, duration and relevant deadlines.
- **Impatto economico:** recurring costs, initial payments and classifications of amounts such as deposits, advance payments and penalties.
- **Punti da verificare:** up to four material issues, ambiguities or missing details that warrant clarification, with document references when identifiable.
- **Prossimo passo:** a practical suggestion for checking the most important unresolved point.

The interface also displays a **"Necessità di verifica" score from 1 to 10** when the model includes one in its response.

This is an AI-generated heuristic describing how much follow-up the document appears to need. It is **not** a legal-risk rating, a fraud detector, a prediction of enforceability or a recommendation to accept or reject a contract.

Amounts, calculations, references and interpretations should always be checked against the original document.

## Data handling and privacy boundary

The application code does **not** write uploaded documents to its own database or persistent file storage.

That does not mean documents remain entirely on the user's device.

The processing path is:

1. The browser temporarily holds the selected files as data URLs.
2. The browser sends their encoded contents to a Netlify Function.
3. The function sends the document content to Google's Gemini API.
4. The generated report returns through Netlify to the browser.

File names are used in the browser interface but are not included in the JSON document payload sent by the current frontend implementation.

The absence of application-level persistence is distinct from the data handling performed by hosting and AI providers. Netlify processes requests and can retain operational logs. Google applies its own terms, processing practices and retention rules, which may differ between paid and unpaid API usage.

The application's deployed Google billing configuration, retention settings and any hosting-level logging or storage policies cannot be established from this repository alone.

Before uploading documents, consult:

- [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms)
- [Google's data-retention guidance](https://ai.google.dev/gemini-api/docs/zdr)
- [Netlify Function logging documentation](https://docs.netlify.com/build/functions/logs/)

Do not upload documents you are not authorized to transmit to an external AI provider. Avoid confidential or sensitive material unless the processing conditions of the deployment have been evaluated and are appropriate for that material.

### API keys and errors

Gemini API keys are read from server-side environment variables. The frontend does not receive them as part of the application response.

The repository's `.gitignore` excludes local `.env` files. Real credentials must never be committed to the repository.

The function returns generic messages for upstream failures rather than exposing raw exceptions or stack traces to the browser. Internal server logs may nevertheless contain upstream error messages and diagnostic information.

The implementation does not guarantee that all document contents or diagnostic data are absent from third-party logs.

## Local setup

### Requirements

- Node.js 20 or later.
- npm.
- [Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/).
- A Gemini API key with access to the configured models.

Clone the repository and install its dependencies:

```bash
git clone https://github.com/falker47/easy-contract.git
cd easy-contract
npm install
```

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead.

Configure a single API key:

```env
GEMINI_API_KEY=your_key_here
```

Alternatively, configure a comma-separated list of keys:

```env
GEMINI_API_KEYS=key_one,key_two
```

When `GEMINI_API_KEYS` contains at least one non-empty value, it takes precedence over `GEMINI_API_KEY`. These keys provide sequential fallback attempts, not load balancing.

Install Netlify CLI if it is not already available:

```bash
npm install -g netlify-cli
```

Start the local development environment:

```bash
netlify dev
```

Open the local address displayed by the CLI.

Netlify Dev runs the frontend alongside the serverless functions. Connecting the project to an existing Netlify site may require `netlify login` and `netlify link`, particularly when using environment configuration managed by Netlify.

Keep local credentials private. Do not use real confidential contracts as test fixtures.

## Checks

Run the repository checks with:

```bash
npm run check
npm test
```

`npm run check` performs JavaScript syntax checks on:

- `functions/analyze.js`
- `functions/prompt.js`
- `script.js`

`npm test` uses Node.js's built-in test runner and executes the files in `tests/`.

The current tests cover:

- Serverless request validation and rejection of malformed inputs.
- Unsupported MIME types and safe error responses.
- Mocked Gemini generation, model fallback and timeout configuration.
- Prompt instructions for evidence-bound contract analysis.
- Selected frontend structure and responsive report-layout requirements.

The tests do not perform a real Gemini API request, exercise a complete upload-to-report browser flow or validate the legal accuracy of generated analyses.

The GitHub Actions workflow in `.github/workflows/ci.yml` runs `npm install`, `npm run check` and `npm test` using Node.js 20.

A successful CI run confirms those automated checks for the tested commit. It does not, by itself, verify the deployed application or a functioning AI analysis.

## Repository structure

```text
easy-contract/
├── .github/
│   └── workflows/
│       └── ci.yml
├── assets/
│   ├── easycontract.ico
│   └── easycontract.webp
├── functions/
│   ├── analyze.js
│   └── prompt.js
├── tests/
│   ├── analyze.test.js
│   ├── prompt.test.js
│   └── ui-layout.test.js
├── legacy/
│   ├── README.md
│   ├── app.py
│   ├── requirements.txt
│   └── ... historical guides and files
├── index.html
├── style.css
├── script.js
├── netlify.toml
├── package.json
└── .env.example
```

The current application is the JavaScript/Netlify implementation in the repository root and `functions/`.

The `legacy/` directory preserves an earlier Python/Streamlit implementation and historical documentation. Its setup instructions, models, feature descriptions and licensing claims must not be treated as documentation of the current application.

## Deployment

The project includes a `netlify.toml` configuration that:

- Publishes the repository root as the static site.
- Uses `functions/` as the Netlify Functions directory.
- Sets Node.js 20 for the build environment.
- Maps `/api/*` to the corresponding Netlify Function paths.

The current frontend calls `/.netlify/functions/analyze` directly.

**Public app:** https://easy-contract.netlify.app/

**Netlify deployment dashboard:** https://app.netlify.com/projects/easy-contract/deploys

The publicly accessible interface and the backend's availability are separate from successful AI processing. A complete production check would also require a successful request with an authorized test document and a correctly configured Gemini API connection.

## Operational limits

- The browser checks an approximate **4.5 MB aggregate file-size limit** before Base64 encoding.
- The backend accepts at most **12 files** in one request.
- The backend limits the combined Base64 data to **6,000,000 characters**.
- Backend MIME validation checks the declared data-URL type; it does not inspect file signatures or prove that the contents match the declared format.
- The backend uses a bounded request budget and model-attempt timeouts. Processing may still fail because of hosting time limits, API availability or quotas.
- Generated output is capped at **1,200 tokens** in the current backend configuration, so lengthy analyses may be incomplete.
- PDF interpretation, scanned text, arithmetic, clause references and legal terminology can all be misread or misrepresented by the AI.
- The report's verification score is a heuristic, not an independently validated legal assessment.
- Questions involving validity, enforceability, jurisdiction or significant legal consequences require appropriate professional review.

This is an experimental reading aid, not a document-security platform or a substitute for a qualified legal professional.

## License status

No project-wide `LICENSE` file is currently present.

A previous README displayed an MIT badge and claimed MIT licensing without the corresponding license text. That unsupported claim has been removed.

The repository does not currently declare an explicit project-wide open-source license. The application's footer attributes the project to **Maurizio Falconi (falker47)**.

Third-party dependencies and services remain subject to their respective licenses and terms.
