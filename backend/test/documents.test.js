const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const configuredMaxFileSize = process.env.DMS_MAX_FILE_SIZE_MB;
process.env.DMS_MAX_FILE_SIZE_MB = '0.001';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
const usersFile = path.resolve(__dirname, '../storage', `users-test-${process.pid}.json`);
process.env.DMS_USERS_FILE = usersFile;
const app = require('../src/app');
if (configuredMaxFileSize === undefined) {
  delete process.env.DMS_MAX_FILE_SIZE_MB;
} else {
  process.env.DMS_MAX_FILE_SIZE_MB = configuredMaxFileSize;
}

test('a API autentica usuários e isola seus documentos', async (context) => {
  const storageDirectory = path.resolve(__dirname, '../storage');
  const initialFiles = new Set([...await fs.readdir(storageDirectory), path.basename(usersFile)]);
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
    await fs.rm(usersFile, { force: true });
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const unauthenticatedResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(unauthenticatedResponse.status, 401);

  const invalidTokenResponse = await fetch(`${baseUrl}/documents`, {
    headers: { Authorization: 'Bearer invalid-token' }
  });
  assert.equal(invalidTokenResponse.status, 401);
  assert.equal((await invalidTokenResponse.json()).error.code, 'INVALID_TOKEN');

  const weakPasswordResponse = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'short' })
  });
  assert.equal(weakPasswordResponse.status, 400);

  async function register(username) {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'correct horse battery staple' })
    });
    assert.equal(response.status, 201);
    return response.json();
  }

  const alice = await register('alice');
  const bob = await register('bob');
  const storedUsers = JSON.parse(await fs.readFile(usersFile, 'utf8'));
  assert.equal(storedUsers.length, 2);
  assert.equal(storedUsers[0].password, undefined);
  assert.notEqual(storedUsers[0].passwordHash, 'correct horse battery staple');
  assert.ok(storedUsers[0].salt);

  const currentUserResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${alice.token}` }
  });
  assert.equal(currentUserResponse.status, 200);
  assert.deepEqual((await currentUserResponse.json()).user, alice.user);

  const duplicateResponse = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'correct horse battery staple' })
  });
  assert.equal(duplicateResponse.status, 409);

  const invalidLoginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'wrong password' })
  });
  assert.equal(invalidLoginResponse.status, 401);

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'correct horse battery staple' })
  });
  assert.equal(loginResponse.status, 200);
  const loggedInAlice = await loginResponse.json();
  assert.equal(loggedInAlice.user.id, alice.user.id);

  const aliceHeaders = { Authorization: `Bearer ${alice.token}` };
  const bobHeaders = { Authorization: `Bearer ${bob.token}` };

  const emptyListResponse = await fetch(`${baseUrl}/documents`, { headers: aliceHeaders });
  assert.equal(emptyListResponse.status, 200);
  assert.deepEqual(await emptyListResponse.json(), { documents: [] });

  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: aliceHeaders,
    body: new FormData()
  });
  assert.equal(missingFileResponse.status, 400);
  assert.equal((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const invalidFieldForm = new FormData();
  invalidFieldForm.append('unexpected', new Blob(['data']), 'sample.txt');
  const invalidFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: aliceHeaders,
    body: invalidFieldForm
  });
  assert.equal(invalidFieldResponse.status, 400);
  assert.equal((await invalidFieldResponse.json()).error.code, 'INVALID_MULTIPART');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(2048)]), 'large.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: aliceHeaders,
    body: oversizedForm
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');
  const filesAfterRejectedUpload = await fs.readdir(storageDirectory);
  assert.deepEqual(filesAfterRejectedUpload.filter((filename) => !initialFiles.has(filename)), []);

  const uploadForm = new FormData();
  uploadForm.append('file', new Blob(['document contents'], { type: 'text/plain' }), 'sample.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: aliceHeaders,
    body: uploadForm
  });

  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'sample.txt');
  assert.equal(document.size, 17);
  assert.equal(document.owner, alice.user.id);
  assert.equal(document.mimeType, 'text/plain');
  assert.ok(document.id);
  assert.ok(document.uploadedAt);
  assert.equal(Object.hasOwn(document, 'storedFilename'), false);

  const listResponse = await fetch(`${baseUrl}/documents`, { headers: aliceHeaders });
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), { documents: [document] });

  const bobListResponse = await fetch(`${baseUrl}/documents`, { headers: bobHeaders });
  assert.deepEqual(await bobListResponse.json(), { documents: [] });

  const bobDownloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: bobHeaders
  });
  assert.equal(bobDownloadResponse.status, 404);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: aliceHeaders
  });
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.match(downloadResponse.headers.get('content-disposition'), /sample\.txt/);
  assert.match(downloadResponse.headers.get('content-type'), /^text\/plain(?:;|$)/);
  assert.equal(await downloadResponse.text(), 'document contents');

  const unknownId = '00000000-0000-4000-8000-000000000001';
  const notFoundResponse = await fetch(`${baseUrl}/documents/${unknownId}/download`, {
    headers: aliceHeaders
  });
  assert.equal(notFoundResponse.status, 404);
  assert.equal((await notFoundResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const traversalId = encodeURIComponent('../../etc/passwd');
  const traversalResponse = await fetch(`${baseUrl}/documents/${traversalId}/download`, {
    headers: aliceHeaders
  });
  assert.equal(traversalResponse.status, 400);
  assert.equal((await traversalResponse.json()).error.code, 'INVALID_DOCUMENT_ID');

  const invalidIdResponse = await fetch(`${baseUrl}/documents/not-a-uuid/download`, {
    headers: aliceHeaders
  });
  assert.equal(invalidIdResponse.status, 400);
  assert.equal((await invalidIdResponse.json()).error.code, 'INVALID_DOCUMENT_ID');
});