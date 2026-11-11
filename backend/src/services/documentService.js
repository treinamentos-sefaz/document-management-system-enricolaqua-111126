const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

class DocumentServiceError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'DocumentServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function withStorageError(operation, message) {
  try {
    return await operation();
  } catch {
    throw new DocumentServiceError(500, 'STORAGE_ERROR', message);
  }
}

async function removeUploadedFile(filename) {
  try {
    await documentRepository.removeStoredFile(filename);
  } catch {}
}

async function registerDocument(document) {
  try {
    return documentRepository.createDocument(document);
  } catch (error) {
    await removeUploadedFile(document.storedFilename);
    throw error;
  }
}

async function uploadDocument(file, ownerId) {
  if (!file) {
    throw new DocumentServiceError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  if (typeof ownerId !== 'string' || ownerId.length === 0) {
    throw new DocumentServiceError(401, 'AUTH_REQUIRED', 'Autentique-se para enviar documentos.');
  }

  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: ownerId,
    mimeType: file.mimetype || 'application/octet-stream',
    storedFilename: file.filename
  };

  return withStorageError(
    () => registerDocument(document),
    'Não foi possível registrar o documento.'
  );
}

function listDocuments(ownerId) {
  return documentRepository.listDocuments(ownerId);
}

async function getDownload(id, ownerId) {
  const download = await withStorageError(
    () => documentRepository.findDownloadById(id, ownerId),
    'Não foi possível acessar o documento.'
  );

  if (!download) {
    throw new DocumentServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return download;
}

module.exports = {
  DocumentServiceError,
  getDownload,
  listDocuments,
  uploadDocument
};