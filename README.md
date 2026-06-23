# Job Hunt Automation

A zero-server browser tool that scans your job suggestion emails (Naukri Priority Applicant, LinkedIn, Glassdoor), generates tailored CVs and cover letters, and tracks everything — all in one click.

**Live app → [sayanrup.github.io/Job_Hunt](https://sayanrup.github.io/Job_Hunt)**

---

## What it does

```
Run Now
  ↓
1. Cleanup   — Deletes Drive CVs where Sheet status = "Sent"
2. Scan      — Reads job emails from Gmail (last 1 / 3 / 7 days)
3. Parse     — Extracts company, role, JD, hiring manager email per job
4. Generate  — Tailored CV + cover letter via AI (only when HM email found)
5. Save      — CV → Google Drive | Draft → Gmail | Row → Google Sheet
```

### Email sources scanned

| Source | Filter |
|---|---|
| Naukri | From `naukri`, subject "Priority Applicant" |
| LinkedIn | From `jobalerts-noreply@linkedin.com` |
| Glassdoor | From `glassdoor` |

Only **Product Manager** and **Senior Product Manager** roles are processed — all others are skipped.

### Outputs per job

| Always | Only if HM email found in job post |
|---|---|
| Row added to tracker sheet | Tailored CV `.txt` saved in Drive |
| — | Gmail draft with cover letter + CV |

---

## One-time setup (5 minutes)

### 1. Get an OpenRouter API key
Sign up at [openrouter.ai](https://openrouter.ai) → Keys → Create key.

### 2. Create a Google OAuth Client ID
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create credentials → OAuth client ID → Web application
3. Under **Authorized JavaScript origins** add:
   - `https://sayanrup.github.io`
   - `http://localhost:8080` (for local dev)
4. Enable APIs: **Gmail API**, **Google Drive API**, **Google Sheets API**

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

| Date | Company | Role | JD Link | HM Email | CV Drive Link | Status |
|---|---|---|---|---|---|---|

**Status values:** `Pending` → `Sent` (set manually) → `Deleted` (auto) | `No HM Email` (auto)

---

## Model options

Choose your AI model from the dropdown before running:

| Model | Cost | Best for |
|---|---|---|
| Haiku 4.5 | ~$0.01/job | Daily use, cheapest (~100 jobs/$1) |
| Kimi K2 | Varies | Alternative if Haiku quota exhausted |
| Qwen3 235B | Free tier | Zero cost option |

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
| LLM | OpenRouter (Haiku 4.5 / Kimi K2 / Qwen3) |
| Email | Gmail API (OAuth 2.0) |
| Storage | Google Drive API + Google Sheets API |
| Hosting | GitHub Pages |

---

## Privacy
All data stays in your browser and Google account. No server, no database, no tracking.
