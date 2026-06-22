const BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveAPI {
  constructor(token) { this.token = token; }

  async _fetch(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${this.token}`, ...opts.headers } });
    if (!res.ok) throw new Error(`Drive ${res.status}: ${await res.text()}`);
    if (res.status === 204) return null;
    return res.json();
  }

  async findOrCreateFolder(name, parentId = null) {
    let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) q += ` and '${parentId}' in parents`;
    const data = await this._fetch(`${BASE}/files?${new URLSearchParams({ q, fields: 'files(id)' })}`);
    if (data.files?.length > 0) return data.files[0].id;
    const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parentId) meta.parents = [parentId];
    const created = await this._fetch(`${BASE}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
    return created.id;
  }

  async uploadTextFile(name, content, folderId) {
    const meta = { name, parents: [folderId], mimeType: 'text/plain' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'text/plain' }));
    const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, { method: 'POST', headers: { Authorization: `Bearer ${this.token}` }, body: form });
    if (!res.ok) throw new Error(`Drive upload ${res.status}`);
    return res.json();
  }

  async findOrCreateSpreadsheet(name, folderId) {
    let q = `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    if (folderId) q += ` and '${folderId}' in parents`;
    const data = await this._fetch(`${BASE}/files?${new URLSearchParams({ q, fields: 'files(id)' })}`);
    if (data.files?.length > 0) return data.files[0].id;
    const meta = { name, mimeType: 'application/vnd.google-apps.spreadsheet' };
    if (folderId) meta.parents = [folderId];
    const created = await this._fetch(`${BASE}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
    return created.id;
  }

  async deleteFile(fileId) {
    const res = await fetch(`${BASE}/files/${fileId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${this.token}` } });
    if (!res.ok && res.status !== 404) throw new Error(`Drive delete ${res.status}`);
  }
}
