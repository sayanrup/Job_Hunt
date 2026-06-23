const JOB_SENDERS = ['naukri', 'priority applicant', 'linkedin.com', 'glassdoor'];

const TARGET_ROLES = ['product manager', 'senior product manager'];

const LINK_PATTERNS = [
  /https?:\/\/[^\s"'<>]*naukri\.com\/job-listings[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*linkedin\.com\/jobs\/view[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*linkedin\.com\/comm\/jobs\/view[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*glassdoor\.com\/job-listing[^\s"'<>]*/gi,
];

export function isTargetRole(role = '') {
  const r = role.toLowerCase().trim();
  return TARGET_ROLES.some(t => r === t || r.startsWith(t));
}

export function isJobEmail(message) {
  const from = (message.payload?.headers || []).find(h => h.name.toLowerCase() === 'from')?.value?.toLowerCase() || '';
  return JOB_SENDERS.some(s => from.includes(s));
}

export function getHeader(message, name) {
  return (message.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export function decodeEmailBody(message) {
  const parts = [];
  function walk(payload) {
    if (payload.body?.data) parts.push({ mime: payload.mimeType, data: payload.body.data });
    (payload.parts || []).forEach(walk);
  }
  walk(message.payload);

  const part = parts.find(p => p.mime === 'text/html') || parts.find(p => p.mime === 'text/plain');
  if (!part) return { text: '', html: '' };

  const decoded = decodeBase64Url(part.data);
  if (part.mime === 'text/html') {
    const div = document.createElement('div');
    div.innerHTML = decoded;
    return { text: div.innerText, html: decoded };
  }
  return { text: decoded, html: '' };
}

export function extractJobLinks(text, html = '') {
  const source = text + ' ' + html;
  const found = new Set();
  for (const re of LINK_PATTERNS) {
    (source.match(re) || []).forEach(m => found.add(m.replace(/[.,;:'">[\])\s]+$/, '')));
  }
  return [...found].slice(0, 5);
}

function decodeBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try { return decodeURIComponent(escape(atob(base64))); } catch { return atob(base64); }
}
