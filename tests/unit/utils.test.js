import { describe, it, expect, beforeEach } from 'vitest';
const { loadApp } = require('../helpers/loadApp');

describe('Utils.formatPrice', () => {
  let Utils;

  beforeEach(() => {
    ({ Utils } = loadApp());
  });

  it('returns "Sob consulta" for zero, negative or missing values', () => {
    expect(Utils.formatPrice(0)).toBe('Sob consulta');
    expect(Utils.formatPrice(-5)).toBe('Sob consulta');
    expect(Utils.formatPrice(undefined)).toBe('Sob consulta');
    expect(Utils.formatPrice(null)).toBe('Sob consulta');
  });

  it('formats positive values with the configured currency and comma decimal', () => {
    expect(Utils.formatPrice(10)).toBe('R$ 10,00');
    expect(Utils.formatPrice(2.5)).toBe('R$ 2,50');
    expect(Utils.formatPrice(1234.5)).toBe('R$ 1234,50');
  });
});

describe('Utils.escapeHtml', () => {
  let Utils;

  beforeEach(() => {
    ({ Utils } = loadApp());
  });

  it('returns an empty string for null/undefined', () => {
    expect(Utils.escapeHtml(null)).toBe('');
    expect(Utils.escapeHtml(undefined)).toBe('');
  });

  it('neutralizes HTML/script content so it cannot inject markup', () => {
    const malicious = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const escaped = Utils.escapeHtml(malicious);

    expect(escaped).not.toContain('<img');
    expect(escaped).not.toContain('<script>');

    // Round-trip through innerHTML must reproduce the original text verbatim,
    // proving the escaped output is inert markup, not executable HTML.
    const probe = document.createElement('div');
    probe.innerHTML = escaped;
    expect(probe.textContent).toBe(malicious);
  });

  it('leaves plain text untouched', () => {
    expect(Utils.escapeHtml('Chaveiro de acrílico')).toBe('Chaveiro de acrílico');
  });
});
