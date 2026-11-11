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

  try {
    return documentRepository.createDocument(document);
  } catch (error) {
    try {
      await documentRepository.removeStoredFile(file.filename);
    } catch {}

    throw new DocumentServiceError(500, 'STORAGE_ERROR', 'Não foi possível registrar o documento.');
  }
}

function listDocuments() {
  return documentRepository.listDocuments();
}

async function getDownload(id) {
  try {
    const download = await documentRepository.findDownloadById(id);

    if (!download) {
      throw new DocumentServiceError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    return download;
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      throw error;
    }

    throw new DocumentServiceError(500, 'STORAGE_ERROR', 'Não foi possível acessar o documento.');
  }
}

module.exports = {
  DocumentServiceError,
  getDownload,
  listDocuments,
  uploadDocument
};