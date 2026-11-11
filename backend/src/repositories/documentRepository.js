const fs = require('node:fs/promises');
const path = require('node:path');
const { STORAGE_DIRECTORY } = require('../config/storage');

const documents = new Map();

function toPublicDocument(document) {
  const { storedFilename, ...publicDocument } = document;
  return publicDocument;
}

function createDocument(document) {
  documents.set(document.id, document);
  return toPublicDocument(document);
}

function listDocuments() {
  return [...documents.values()]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map(toPublicDocument);
}

async function findDownloadById(id) {
  const document = documents.get(id);

  if (!document) {
    return null;
  }

  const filePath = path.join(STORAGE_DIRECTORY, document.storedFilename);

  try {
    const fileStats = await fs.stat(filePath);

    if (!fileStats.isFile()) {
      return null;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }

  return {
    document: toPublicDocument(document),
    filePath
  };
}

async function removeStoredFile(filename) {
  if (path.basename(filename) !== filename) {
    throw new Error('Nome de arquivo interno inválido.');
  }

  await fs.unlink(path.join(STORAGE_DIRECTORY, filename));
}

module.exports = {
  createDocument,
  findDownloadById,
  listDocuments,
  removeStoredFile
};