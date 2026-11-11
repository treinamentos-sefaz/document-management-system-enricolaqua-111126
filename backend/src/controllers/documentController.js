const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { pipeline } = require('node:stream/promises');
const documentService = require('../services/documentService');
const { DocumentServiceError } = documentService;

const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function upload(req, res, next) {
  try {
    const document = await documentService.uploadDocument(req.file);
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
}

function list(_req, res, next) {
  try {
    res.json({ documents: documentService.listDocuments() });
  } catch (error) {
    next(error);
  }
}

async function download(req, res, next) {
  if (!DOCUMENT_ID_PATTERN.test(req.params.id)) {
    return next(new DocumentServiceError(400, 'INVALID_DOCUMENT_ID', 'O identificador do documento é inválido.'));
  }

  try {
    const { document, filePath } = await documentService.getDownload(req.params.id);
    const fileStream = fs.createReadStream(filePath);

    await once(fileStream, 'open');
    const downloadName = path.posix.basename(document.originalName.replace(/\\/g, '/')) || 'document';
    res.attachment(downloadName);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    await pipeline(fileStream, res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  download,
  list,
  upload
};