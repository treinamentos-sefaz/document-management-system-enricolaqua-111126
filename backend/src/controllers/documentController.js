const fs = require('node:fs');
const { once } = require('node:events');
const { pipeline } = require('node:stream/promises');
const documentService = require('../services/documentService');

async function upload(req, res) {
  const document = await documentService.uploadDocument(req.file);
  res.status(201).json({ document });
}

function list(_req, res) {
  res.json({ documents: documentService.listDocuments() });
}

async function download(req, res) {
  const { document, filePath } = await documentService.getDownload(req.params.id);
  const fileStream = fs.createReadStream(filePath);

  await once(fileStream, 'open');
  res.attachment(document.originalName);
  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  await pipeline(fileStream, res);
}

module.exports = {
  download,
  list,
  upload
};