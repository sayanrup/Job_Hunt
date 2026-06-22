import { App } from './app.js';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.compose','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/spreadsheets'].join(' ');
const KEYS = { clientId: 'jha_google_client_id', apiKey: 'jha_openrouter_key', baseCV: 'jha_base_cv', sheetId: 'jha_spreadsheet_id' };

let tokenClient = null, accessToken = null;
const app = new App();
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

function showError(msg) { const el = document.getElementById('error-msg'); el.textContent = msg; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 6000); }
function showSuccess(msg) { const el = document.getElementById('success-msg'); el.textContent = msg; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 3000); }

function buildTokenClient(clientId) {
  if (!window.google?.accounts?.oauth2) { showError('Google Identity Services not loaded.'); return null; }
  return window.google.accounts.oauth2.initTokenClient({
    client_id: clientId, scope: SCOPES,
    callback: resp => {
      if (resp.error) { showError('Google sign-in failed: ' + resp.error); return; }
      accessToken = resp.access_token; onSignedIn();
    },
  });
}

function requestSignIn() {
  const clientId = document.getElementById('google-client-id').value.trim();
  if (!clientId) { showError('Enter your Google Client ID first'); return; }
  store.set(KEYS.clientId, clientId);
  tokenClient = buildTokenClient(clientId);
  tokenClient?.requestAccessToken({ prompt: 'consent' });
}

function onSignedIn() {
  document.getElementById('google-signin-btn').classList.add('hidden');
  document.getElementById('user-info').classList.remove('hidden');
  document.getElementById('run-btn').disabled = false;
  document.getElementById('user-email-display').textContent = '✓ Google Connected';
  showSuccess('Google account connected');
}

function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null;
  document.getElementById('google-signin-btn').classList.remove('hidden');
  document.getElementById('user-info').classList.add('hidden');
  document.getElementById('run-btn').disabled = true;
}

function initSetupToggle() {
  const card = document.getElementById('setup-card'), body = document.getElementById('setup-body');
  document.getElementById('setup-toggle').addEventListener('click', () => {
    const collapsed = body.classList.toggle('hidden');
    card.classList.toggle('collapsed', collapsed);
  });
}

function saveSettings() {
  const clientId = document.getElementById('google-client-id').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const baseCV = document.getElementById('base-cv').value.trim();
  const sheetId = document.getElementById('spreadsheet-id').value.trim();
  if (!apiKey) { showError('OpenRouter API key is required'); return; }
  if (!baseCV) { showError('Please paste your base CV'); return; }
  if (clientId) store.set(KEYS.clientId, clientId);
  store.set(KEYS.apiKey, apiKey); store.set(KEYS.baseCV, baseCV);
  if (sheetId) store.set(KEYS.sheetId, sheetId);
  showSuccess('Settings saved');
}

async function runPipeline() {
  const apiKey = store.get(KEYS.apiKey) || document.getElementById('api-key').value.trim();
  const baseCV = store.get(KEYS.baseCV) || document.getElementById('base-cv').value.trim();
  const sheetId = store.get(KEYS.sheetId) || document.getElementById('spreadsheet-id').value.trim();
  const days = parseInt(document.getElementById('date-range').value, 10);
  if (!accessToken) { showError('Please sign in with Google first'); return; }
  if (!apiKey) { showError('OpenRouter API key is missing'); return; }
  if (!baseCV) { showError('Paste your base CV in Setup'); return; }
  const btn = document.getElementById('run-btn');
  btn.disabled = true; btn.textContent = '⏳ Running...';
  try { app.setup(accessToken, sheetId || null); await app.run(apiKey, baseCV, days); }
  catch (err) { showError('Run failed: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = '▶ Run Now'; }
}

function init() {
  const savedClientId = store.get(KEYS.clientId), savedKey = store.get(KEYS.apiKey), savedCV = store.get(KEYS.baseCV), savedSheetId = store.get(KEYS.sheetId);
  if (savedClientId) document.getElementById('google-client-id').value = savedClientId;
  if (savedKey) document.getElementById('api-key').value = savedKey;
  if (savedCV) document.getElementById('base-cv').value = savedCV;
  if (savedSheetId) document.getElementById('spreadsheet-id').value = savedSheetId;
  document.getElementById('google-signin-btn').addEventListener('click', requestSignIn);
  document.getElementById('signout-btn').addEventListener('click', signOut);
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('run-btn').addEventListener('click', runPipeline);
  initSetupToggle();
  if (savedClientId) {
    const poll = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(poll); tokenClient = buildTokenClient(savedClientId); }
    }, 200);
  }
}

document.addEventListener('DOMContentLoaded', init);
