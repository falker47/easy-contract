const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('home implements the approved MagicPath two-column composition', () => {
  assert.match(html, /class="home-layout"/);
  assert.match(html, /class="trust-badge"/);
  assert.match(html, /class="upload-card"/);
  assert.match(html, /Capisci cosa conta/);
  assert.match(html, /prima di firmare\./);
});

test('results expose the approved compact report shell', () => {
  assert.match(html, /class="results-brand"/);
  assert.match(html, /class="results-overview"/);
  assert.match(html, /id="scoreContainer" class="score-container hidden"/);
  assert.match(html, /id="markdownOutput" class="markdown-body"/);
});


test('adapts the report when top sections are materially imbalanced', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

  assert.match(script, /function updateReportLayout\(\)/);
  assert.match(script, /getBoundingClientRect\(\)\.height/);
  assert.match(script, /heightDelta > 96 && heightRatio > 1\.28/);
  assert.match(script, /classList\.toggle\('report-stacked', shouldStack\)/);
  assert.match(script, /addEventListener\('resize', scheduleReportLayoutUpdate\)/);
  assert.match(css, /\.markdown-body\.report-stacked/);
  assert.match(css, /\.markdown-body\.report-stacked \.summary-grid[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
});
