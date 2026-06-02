import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities, htmlToPlainText, normalizeHtmlText } from './htmlText.js';

describe('decodeHtmlEntities', () => {
  it('decodes nbsp and named entities', () => {
    expect(decodeHtmlEntities('Hello&nbsp;world &amp; team')).toBe('Hello world & team');
  });

  it('decodes numeric entities', () => {
    expect(decodeHtmlEntities('Hi&#39; there')).toBe("Hi' there");
  });
});

describe('htmlToPlainText', () => {
  it('strips tags and decodes entities', () => {
    const out = htmlToPlainText('<p>Line&nbsp;one</p>');
    expect(out).toBe('Line one');
    expect(out).not.toContain('&nbsp;');
  });
});

describe('normalizeHtmlText', () => {
  it('decodes entities without HTML tags', () => {
    expect(normalizeHtmlText('Plain&nbsp;text')).toBe('Plain text');
  });
});
