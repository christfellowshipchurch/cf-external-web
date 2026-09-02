/** BOM, ZWSP, word joiner, etc. — common in CMS or copy-paste. */
const COMMON_INVISIBLE_UNICODE = /[\uFEFF\u200B-\u200D\u2060]/g;

/**
 * Removes common invisible Unicode characters, then trims whitespace.
 */
export function trimRemovingInvisibleUnicode(value: string): string {
  return value.replace(COMMON_INVISIBLE_UNICODE, '').trim();
}

/**
 * Best-effort collapse of HTML to visible characters: strips tags (and
 * `script` / `style` blocks), treats `<br>` and common block closers as breaks,
 * decodes frequent non-breaking-space entities, then removes whitespace.
 *
 * Use this to detect “empty” rich text such as `<p></p>`, `<p>&nbsp;</p>`,
 * or `<br>`-only fragments without parsing the full DOM.
 */
export function collapseHtmlToVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/\s*(?:p|div|h[1-6]|li|tr|td|th)\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(?:160|x0*A0);/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Collapses HTML to readable plain text, preserving word spacing.
 *
 * Distinct from `collapseHtmlToVisibleText`, which deletes whitespace entirely
 * because it only answers "is there anything visible here?". Use this one when
 * the result is shown to a person — e.g. an .ics DESCRIPTION, where
 * "Ticket Price: $199" must not arrive as "TicketPrice:$199".
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/\s*(?:p|div|h[1-6]|li|tr|td|th)\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(?:160|x0*A0);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
