import DOMPurify from 'dompurify';

/**
 * Sanitizes WordPress-rendered HTML before it is ever inserted into the extension DOM.
 * Strips scripts/event handlers and forces safe target/rel on links.
 */
export function sanitizeWordPressHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style'],
  });

  const template = document.createElement('template');
  template.innerHTML = clean;
  template.content.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer nofollow');
  });
  return template.innerHTML;
}
