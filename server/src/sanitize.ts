import sanitizeHtml from 'sanitize-html';
export const sanitize = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'hr',
    ],
    allowedAttributes: { ol: ['start'] },
    disallowedTagsMode: 'discard',
    nestingLimit: 30,
  });
