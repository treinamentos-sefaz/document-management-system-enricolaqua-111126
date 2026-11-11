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

export async function listDocuments({ signal } = {}) {
  const response = await fetch(`${API_PREFIX}/documents`, { signal });
  const body = await ensureSuccess(response);
  const result = await body.json();
  return result.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData
  });
  const body = await ensureSuccess(response);
  const result = await body.json();
  return result.document;
}

export async function downloadDocument(id) {
  const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(id)}/download`);
  const body = await ensureSuccess(response);
  return body.blob();
}