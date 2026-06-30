import { GmailAPI } from './api/gmail.js';
import { DriveAPI } from './api/drive.js';
import { SheetsAPI } from './api/sheets.js';
import { OpenRouterAPI } from './api/openrouter.js';
import { ContentGenerator } from './utils/generator.js';
import { isJobEmail, isTargetRole, getHeader, decodeEmailBody, extractJobLinks } from './utils/emailParser.js';

const SHEET_NAME = 'Job Applications Tracker';
const ROOT_FOLDER = 'Job Hunt Automation';
const CV_FOLDER = 'CVs';

export class App {
  constructor() { this.results = []; this.$log = document.getElementById('progress-log'); }

  setup(token, spreadsheetId) {
    this._token = token;
    this.gmail = new GmailAPI(token);
    this.drive = new DriveAPI(token);
    this.sheets = spreadsheetId ? new SheetsAPI(token) : null;
    this.spreadsheetId = spreadsheetId;
  }

  log(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `log-entry log-${type}`;
    el.textContent = `${new Date().toLocaleTimeString('en-IN', { hour12: false })} — ${msg}`;
    this.$log.appendChild(el);
    this.$log.scrollTop = this.$log.scrollHeight;
  }

  step(id, state) {
    const el = document.getElementById(id);
    if (el) el.className = `step ${state}`;
    if (state === 'done') {
      const line = el?.nextElementSibling;
      if (line?.classList.contains('step-line')) line.style.background = 'var(--green)';
    }
  }

  async run(apiKey, baseCV, days, model) {
    document.getElementById('progress-card').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    this.$log.innerHTML = '';
    this.results = [];
    const gen = new ContentGenerator(new OpenRouterAPI(apiKey, model));

    this.step('step-cleanup', 'active');
    this.log('Starting cleanup...');
    await this._cleanup();
    this.step('step-cleanup', 'done');

    this.step('step-scan', 'active');
    this.log(`Scanning Gmail (last ${days} day${days > 1 ? 's' : ''})...`);
    const emails = await this._scanGmail(days);
    this.log(`Found ${emails.length} job email(s)`, emails.length ? 'info' : 'warn');
    this.step('step-scan', 'done');
    if (!emails.length) { this.log('No job emails — done.', 'warn'); return; }

    const leads = [];
    const seenLinks = new Set();
    for (const email of emails) {
      const { text, html } = decodeEmailBody(email);
      const subject = getHeader(email, 'subject');
      const links = extractJobLinks(text, html).filter(l => !seenLinks.has(l) && seenLinks.add(l));
      if (links.length) links.forEach(link => leads.push({ link, text, subject }));
      else if (!seenLinks.has(subject) && seenLinks.add(subject)) leads.push({ link: null, text, subject });
    }
    this.log(`Extracted ${leads.length} job lead(s)`);
    this.step('step-parse', 'active');

    const rootId = await this.drive.findOrCreateFolder(ROOT_FOLDER);
    const cvFolderId = await this.drive.findOrCreateFolder(CV_FOLDER, rootId);

    if (!this.spreadsheetId) {
      this.spreadsheetId = await this.drive.findOrCreateSpreadsheet(SHEET_NAME, rootId);
      this.sheets = new SheetsAPI(this._token);
      this.log(`Sheet auto-created in Drive: ${SHEET_NAME}`);
    }
    if (this.sheets && this.spreadsheetId) await this.sheets.ensureHeaders(this.spreadsheetId, SHEET_NAME);

    const seenJobs = new Set();
    for (let i = 0; i < leads.length; i++) {
      const { link, text, subject } = leads[i];
      this.log(`Job ${i + 1}/${leads.length}: ${subject.slice(0, 55)}...`);
      try {
        const job = await gen.extractJobDetails(link, subject, text);
        this.log(`  → ${job.company} | ${job.role}`);
        if (!isTargetRole(job.role)) { this.log(`  ↷ Skipped — not a PM/SPM role`, 'warn'); continue; }
        const jobKey = `${job.company}::${job.role}`.toLowerCase();
        if (seenJobs.has(jobKey)) { this.log(`  ↷ Duplicate — already processed`, 'warn'); continue; }
        seenJobs.add(jobKey);
        this.step('step-parse', 'done');
        this.step('step-generate', 'active');

        if (!job.hmEmail) {
          this.log(`  ↷ No HM email — skipping CV generation`, 'warn');
          if (this.sheets && this.spreadsheetId) {
            const date = new Date().toISOString().split('T')[0];
            const jdLink = job.jdLink || link || '';
            await this.sheets.appendRow(this.spreadsheetId, SHEET_NAME, [date, job.company, job.role, jdLink, job.hmLinkedIn || '', '', 'No HM Email']);
          }
          this.results.push({ job, link, cvLink: null, coverLetter: null, draftCreated: false });
          this._renderResults();
          continue;
        }

        const [cv, coverLetter] = await Promise.all([gen.generateCV(baseCV, job), gen.generateCoverLetter(baseCV, job)]);
        this.log('  → Materials generated');
        this.step('step-generate', 'done');
        this.step('step-save', 'active');

        const date = new Date().toISOString().split('T')[0];
        const fileName = `${job.company}_${job.role}_${date}.txt`.replace(/[/\\?%*:|"<>\s]+/g, '_');
        const { webViewLink: cvLink } = await this.drive.uploadTextFile(fileName, cv, cvFolderId);
        this.log(`  → CV saved: ${fileName}`);

        const draft = gen.buildEmailDraft(coverLetter, cv, job);
        await this.gmail.createDraft(job.hmEmail, draft.subject, draft.body);
        this.log(`  → Draft created for ${job.hmEmail}`);

        if (this.sheets && this.spreadsheetId) {
          const jdLink = job.jdLink || link || '';
          const hmContact = job.hmEmail || job.hmLinkedIn || '';
          await this.sheets.appendRow(this.spreadsheetId, SHEET_NAME, [date, job.company, job.role, jdLink, hmContact, cvLink, 'Pending']);
          this.log('  → Row added to tracker');
        }

        this.step('step-save', 'done');
        this.results.push({ job, link, cvLink, coverLetter, draftCreated: true });
        this._renderResults();
        if (i < leads.length - 1) await new Promise(r => setTimeout(r, 1000));
      } catch (err) { this.log(`  ✗ ${err.message}`, 'error'); }
    }
    this.log(`✓ Done — ${this.results.length} job(s) processed`, 'success');
    return { spreadsheetId: this.spreadsheetId };
  }

  async _cleanup() {
    if (!this.sheets || !this.spreadsheetId) { this.log('No sheet configured, skipping cleanup'); return; }
    try {
      const rows = await this.sheets.getValues(this.spreadsheetId, `${SHEET_NAME}!A2:G`);
      let n = 0;
      for (let i = 0; i < rows.length; i++) {
        const [,,,,,cvLink, status] = rows[i];
        if (status === 'Sent' && cvLink) {
          const m = cvLink.match(/\/file\/d\/([^/]+)/);
          if (m) { await this.drive.deleteFile(m[1]).catch(() => {}); await this.sheets.updateCell(this.spreadsheetId, `${SHEET_NAME}!G${i + 2}`, 'Deleted'); n++; }
        }
      }
      this.log(`Cleanup: removed ${n} CV(s)`);
    } catch (err) { this.log(`Cleanup skipped: ${err.message}`, 'warn'); }
  }

  async _scanGmail(days) {
    const queries = [
      `from:"Priority Applicant" newer_than:${days}d`,
      `from:naukri newer_than:${days}d`,
      `from:jobalerts-noreply@linkedin.com newer_than:${days}d`,
      `from:glassdoor newer_than:${days}d`,
    ];
    const seen = new Set();
    const all = [];
    for (const q of queries) {
      try {
        const msgs = await this.gmail.listMessages(q, 20);
        this.log(`  Query "${q.split(' ')[0]} ${q.split(' ')[1]}" → ${msgs.length} result(s)`);
        for (const m of msgs) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          const full = await this.gmail.getMessage(m.id);
          if (isJobEmail(full)) all.push(full);
          else this.log(`  ↷ Skipped (sender not matched): ${m.id}`, 'warn');
        }
      } catch (e) { this.log(`Scan warning: ${e.message}`, 'warn'); }
    }
    return all;
  }

  _renderResults() {
    const container = document.getElementById('job-cards');
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('results-count').textContent = this.results.length;
    container.innerHTML = '';
    this.results.forEach(({ job, link, cvLink, coverLetter, draftCreated }) => {
      const card = document.createElement('div');
      card.className = 'job-card';
      card.innerHTML = `
        <div class="job-card-header">
          <h3>${esc(job.company)} — ${esc(job.role)}</h3>
          <div style="display:flex;gap:8px;align-items:center">
            ${draftCreated ? '<span class="tag">Draft Created</span>' : ''}
            <span class="status-badge ${draftCreated ? 'status-draft' : 'status-pending'}">Pending</span>
          </div>
        </div>
        <div class="job-card-body">
          <div class="job-meta">
            ${(job.jdLink || link) ? `<a href="${esc(job.jdLink || link)}" target="_blank" class="link">📋 View JD</a>` : ''}
            ${cvLink ? `<a href="${esc(cvLink)}" target="_blank" class="link">📄 View CV on Drive</a>` : ''}
            ${job.hmEmail ? `<a href="mailto:${esc(job.hmEmail)}" class="link">📧 ${esc(job.hmEmail)}</a>` : ''}
            ${job.hmLinkedIn ? `<a href="${esc(job.hmLinkedIn)}" target="_blank" class="link">🔗 Hiring Team Profile</a>` : ''}
            ${job.location ? `<span style="color:var(--text-muted);font-size:13px">📍 ${esc(job.location)}</span>` : ''}
          </div>
          ${coverLetter ? `
          <details>
            <summary>Cover Letter</summary>
            <div class="copyable-box" style="margin-top:8px">
              <pre id="cl-${this.results.length}">${esc(coverLetter)}</pre>
              <button class="btn btn-copy" onclick="copyText('cl-${this.results.length}',this)">Copy</button>
            </div>
          </details>` : ''}
          ${job.jdSummary ? `<details><summary>JD Summary</summary><p style="font-size:13px;color:var(--text-muted);padding:8px 0">${esc(job.jdSummary)}</p></details>` : ''}
        </div>`;
      container.prepend(card);
    });
  }
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.copyText = (id, btn) => {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText || el.textContent).then(() => {
    const prev = btn.textContent; btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  });
};
