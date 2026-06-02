/**
 * Decodes common HTML entities to plain characters and normalizes whitespace.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const num = Number(code);
      return Number.isFinite(num) ? String.fromCharCode(num) : '';
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Returns true when text likely contains HTML markup.
 */
export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Converts SDP HTML bodies to plain text with entity decoding.
 */
export function htmlToPlainText(html: string): string {
  const stripped = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(stripped);
}

/**
 * Normalizes plain text that may contain HTML entities without tags.
 */
export function normalizeHtmlText(text: string): string {
  if (looksLikeHtml(text)) {
    return htmlToPlainText(text);
  }
  if (/&(?:#\d+|#x[\da-f]+|\w+);/i.test(text)) {
    return decodeHtmlEntities(text);
  }
  return text;
}
