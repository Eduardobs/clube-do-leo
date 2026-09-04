import { describe, it, expect } from 'vitest';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..', '..');

function getElementIdsReferencedIn(...jsFileNames) {
  const ids = new Set();
  jsFileNames.forEach((fileName) => {
    const source = fs.readFileSync(path.join(ROOT_DIR, 'src', fileName), 'utf-8');
    for (const match of source.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      ids.add(match[1]);
    }
  });
  return [...ids];
}

// Some ids (e.g. detail-main-image, detail-quantity) are injected into the
// DOM at runtime by these same files' template strings, not present in the
// static HTML. Treat those as self-provided rather than missing.
function getElementIdsRenderedBy(...jsFileNames) {
  const ids = new Set();
  jsFileNames.forEach((fileName) => {
    const source = fs.readFileSync(path.join(ROOT_DIR, 'src', fileName), 'utf-8');
    for (const match of source.matchAll(/\bid=["'`]([^"'`$]+)["'`]/g)) {
      ids.add(match[1]);
    }
  });
  return ids;
}

function readHtml(fileName) {
  return fs.readFileSync(path.join(ROOT_DIR, fileName), 'utf-8');
}

describe('every getElementById referenced by JS exists in its HTML page', () => {
  it('index.html provides every id used by main.js, products.js and cart.js', () => {
    const dom = new JSDOM(readHtml('index.html'));
    const ids = getElementIdsReferencedIn('pages/storefront.js', 'features/catalog/products.js', 'features/cart/cart.js');
    const renderedAtRuntime = getElementIdsRenderedBy('features/catalog/products.js', 'features/cart/cart.js');

    const missing = ids.filter((id) => !dom.window.document.getElementById(id) && !renderedAtRuntime.has(id));
    expect(missing).toEqual([]);
  });

  it('admin.html provides every id used by admin.js', () => {
    const dom = new JSDOM(readHtml('admin.html'));
    const ids = getElementIdsReferencedIn('features/admin/admin.js');
    const renderedAtRuntime = getElementIdsRenderedBy('features/admin/admin.js');

    const missing = ids.filter((id) => !dom.window.document.getElementById(id) && !renderedAtRuntime.has(id));
    expect(missing).toEqual([]);
  });
});

describe('local asset references resolve to real files', () => {
  function localAssetPaths(htmlFileName) {
    const dom = new JSDOM(readHtml(htmlFileName));
    const elements = [
      ...dom.window.document.querySelectorAll('script[src], link[href], img[src], a[href]'),
    ];
    return elements
      .map((el) => el.getAttribute('src') || el.getAttribute('href'))
      .filter((src) => src && !/^([a-z]+:)?\/\//i.test(src) && !src.startsWith('#') && !src.startsWith('mailto:'))
      .map((src) => src.split(/[?#]/, 1)[0]);
  }

  it.each(['index.html', 'admin.html', 'politica-de-precos.html'])('every local asset referenced in %s exists on disk', (htmlFileName) => {
    const missing = localAssetPaths(htmlFileName).filter((assetPath) => !fs.existsSync(path.join(ROOT_DIR, assetPath)));
    expect(missing).toEqual([]);
  });
});
