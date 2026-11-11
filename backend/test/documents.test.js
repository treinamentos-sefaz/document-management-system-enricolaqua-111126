const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const configuredMaxFileSize = process.env.DMS_MAX_FILE_SIZE_MB;
process.env.DMS_MAX_FILE_SIZE_MB = '0.001';
const app = require('../src/app');
if (configuredMaxFileSize === undefined) {
  delete process.env.DMS_MAX_FILE_SIZE_MB;
} else {
  process.env.DMS_MAX_FILE_SIZE_MB = configuredMaxFileSize;
}

test('a API permite enviar, listar e baixar documentos', async (context) => {
  const storageDirectory = path.resolve(__dirname, '../storage');
  const initialFiles = new Set(await fs.readdir(storageDirectory));
  const server = app.listen(0, '127.0.0.1');

  await once(server, 'listening');
  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });

    const storedFiles = await fs.readdir(storageDirectory);
    await Promise.all(storedFiles
      .filter((filename) => !initialFiles.has(filename))
      .map((filename) => fs.unlink(path.join(storageDirectory, filename))));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const emptyListResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(emptyListResponse.status, 200);
  assert.deepEqual(await emptyListResponse.json(), { documents: [] });

  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData()
  });
  assert.equal(missingFileResponse.status, 400);
  assert.equal((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const invalidFieldForm = new FormData();
  invalidFieldForm.append('unexpected', new Blob(['data']), 'sample.txt');
  const invalidFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidFieldForm
  });
  assert.equal(invalidFieldResponse.status, 400);
  assert.equal((await invalidFieldResponse.json()).error.code, 'INVALID_MULTIPART');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(2048)]), 'large.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedForm
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  const uploadForm = new FormData();
  uploadForm.append('file', new Blob(['document contents'], { type: 'text/plain' }), 'sample.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: uploadForm
  });

  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'sample.txt');
  assert.equal(document.size, 17);
  assert.equal(document.owner, 'demo-user');
  assert.equal(document.mimeType, 'text/plain');
  assert.ok(document.id);
  assert.ok(document.uploadedAt);
  assert.equal(Object.hasOwn(document, 'storedFilename'), false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), { documents: [document] });

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.match(downloadResponse.headers.get('content-disposition'), /sample\.txt/);
  assert.match(downloadResponse.headers.get('content-type'), /^text\/plain(?:;|$)/);
  assert.equal(await downloadResponse.text(), 'document contents');

  const notFoundResponse = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.equal(notFoundResponse.status, 404);
  assert.equal((await notFoundResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});