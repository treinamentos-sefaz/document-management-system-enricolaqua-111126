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

async function uploadDocument(file) {
  if (!file) {
    throw new DocumentServiceError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: 'demo-user',
    mimeType: file.mimetype || 'application/octet-stream',
    storedFilename: file.filename
  };

  return withStorageError(
    () => registerDocument(document),
    'Não foi possível registrar o documento.'
  );
}

function listDocuments() {
  return documentRepository.listDocuments();
}

async function getDownload(id) {
  const download = await withStorageError(
    () => documentRepository.findDownloadById(id),
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