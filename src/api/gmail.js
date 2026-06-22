export class GmailAPI {
  constructor(token) {
    this.token = token;
    this.base = 'https://gmail.googleapis.com/gmail/v1/users/me';
  }

  async _fetch(path, opts = {}) {
    const res = await fetch(`${this.base}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...opts.headers },
    });
    if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async listMessages(query, max = 30) {
    const params = new URLSearchParams({ q: query, maxResults: max });
    const data = await this._fetch(`/messages?${params}`);
    return data.messages || [];
  }

  async getMessage(id) {
    return this._fetch(`/messages/${id}?format=full`);
  }

  async createDraft(to, subject, body) {
    const raw = [`To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', body].join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return this._fetch('/drafts', { method: 'POST', body: JSON.stringify({ message: { raw: encoded } }) });
  }
}
