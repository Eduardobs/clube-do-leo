const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

/**
 * Reads a real HTML page from the project root and returns its <body>
 * markup with <script> tags stripped, so tests exercise the actual
 * production markup instead of a hand-maintained copy that can drift.
 */
function readBodyFixture(htmlFileName) {
  const html = fs.readFileSync(path.join(ROOT_DIR, htmlFileName), 'utf-8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) throw new Error(`Could not find <body> in ${htmlFileName}`);
  return bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

module.exports = { readBodyFixture, ROOT_DIR };
