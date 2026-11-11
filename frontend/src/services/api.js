const API_PREFIX = '/api';

async function readError(response) {
  try {
    const body = await response.json();
    return body.error?.message || 'Não foi possível concluir a solicitação.';
  } catch {
    return 'Não foi possível concluir a solicitação.';
  }
}

async function ensureSuccess(response) {
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response;
}

async function postJson(path, payload) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await ensureSuccess(response);
  return body.json();
}

function authorizationHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function registerUser(credentials) {
  return postJson('/auth/register', credentials);
}

export function loginUser(credentials) {
  return postJson('/auth/login', credentials);
}

export async function listDocuments({ signal, token } = {}) {
  const response = await fetch(`${API_PREFIX}/documents`, {
    signal,
    headers: authorizationHeaders(token)
  });
  const body = await ensureSuccess(response);
  const result = await body.json();
  return result.documents;
}

export async function uploadDocument(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    headers: authorizationHeaders(token),
    body: formData
  });
  const body = await ensureSuccess(response);
  const result = await body.json();
  return result.document;
}

export async function downloadDocument(id, token) {
  const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(id)}/download`, {
    headers: authorizationHeaders(token)
  });
  const body = await ensureSuccess(response);
  return body.blob();
}