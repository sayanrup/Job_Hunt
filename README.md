# Job Hunt Automation

A zero-server browser tool that processes your daily job suggestion emails (Naukri, LinkedIn, Instahyre), generates tailored CVs, cover letters, and LinkedIn messages — all in one click.

**Live app → [sayanrup.github.io/Job_Hunt](https://sayanrup.github.io/Job_Hunt)**

---

## What it does

```
Run Now
  ↓
1. Cleanup   — Deletes Drive CVs where Sheet status = "Sent"
2. Scan      — Reads job emails from Gmail (last 1 / 3 / 7 days)
3. Parse     — Extracts company, role, JD, hiring manager email per job
4. Generate  — Tailored CV + cover letter + LinkedIn message via Claude
5. Save      — CV → Google Drive | Draft → Gmail | Row → Google Sheet
```

### Outputs per job

| Always | If HM email found |
|---|---|
| CV `.txt` in Drive → `Job Applications/CVs/` | Gmail draft with cover letter + CV |
| Row in `Job Applications Tracker` sheet | — |
| LinkedIn message (copyable in UI) | — |

---

## One-time setup (5 minutes)

### 1. Get an OpenRouter API key
Sign up at [openrouter.ai](https://openrouter.ai) → Keys → Create key. Model used: `anthropic/claude-sonnet-4-5`

### 2. Create a Google OAuth Client ID
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create credentials → OAuth client ID → Web application
3. Under **Authorized JavaScript origins** add:
   - `https://sayanrup.github.io`
   - `http://localhost:8080` (for local dev)
4. Enable APIs: Gmail API, Google Drive API, Google Sheets API

### 3. Open the app
Go to [sayanrup.github.io/Job_Hunt](https://sayanrup.github.io/Job_Hunt), fill Setup, sign in with Google, click **▶ Run Now**.

---

## Daily workflow

| Step | Action |
|---|---|
| Morning | Open app → click **Run Now** |
| After applying | Type `Sent` in the Status column for that job |
| Next run | App auto-deletes the Drive CV, marks row as `Deleted` |

---

## Sheet columns

| Date | Company | Role | JD Link | HM Email | CV Drive Link | LinkedIn Message | Status |
|---|---|---|---|---|---|---|---|

**Status values:** `Pending` → `Sent` (set manually) → `Deleted` (auto)

---

## Running locally

```bash
git clone https://github.com/sayanrup/Job_Hunt.git
cd Job_Hunt
python3 -m http.server 8080
```

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | Vanilla JS + ES Modules (no build step) |
| LLM | OpenRouter → `anthropic/claude-sonnet-4-5` |
| Email | Gmail API (OAuth 2.0) |
| Storage | Google Drive API + Google Sheets API |
| Hosting | GitHub Pages |

---

## Privacy
All data stays in your browser and Google account. No server, no database, no tracking.
