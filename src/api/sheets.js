const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetsAPI {
  constructor(token) { this.token = token; }

  async _fetch(path, opts = {}) {
    const res = await fetch(`${BASE}${path}`, { ...opts, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...opts.headers } });
    if (!res.ok) throw new Error(`Sheets ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async ensureSheet(spreadsheetId, sheetName) {
    const data = await this._fetch(`/${spreadsheetId}`);
    if (!data.sheets.some(s => s.properties.title === sheetName)) {
      await this._fetch(`/${spreadsheetId}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }) });
    }
  }

  async ensureHeaders(spreadsheetId, sheetName) {
    const headers = ['Date', 'Company', 'Role', 'JD Link', 'HM Email', 'CV Drive Link', 'Status'];
    await this.ensureSheet(spreadsheetId, sheetName);
    const range = `${sheetName}!A1:G1`;
    const data = await this._fetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);
    if (!data.values?.length) {
      await this._fetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { method: 'PUT', body: JSON.stringify({ values: [headers] }) });
    }
  }

  async getValues(spreadsheetId, range) {
    const data = await this._fetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);
    return data.values || [];
  }

  async appendRow(spreadsheetId, sheetName, row) {
    return this._fetch(`/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A:G`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ values: [row] }) });
  }

  async updateCell(spreadsheetId, range, value) {
    return this._fetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { method: 'PUT', body: JSON.stringify({ values: [[value]] }) });
  }
}
