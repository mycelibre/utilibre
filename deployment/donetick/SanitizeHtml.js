import DOMPurify from 'dompurify'
export const sanitizeHtml = html => DOMPurify.sanitize(html || '', { ADD_ATTR: ['dt-data-path'] })
