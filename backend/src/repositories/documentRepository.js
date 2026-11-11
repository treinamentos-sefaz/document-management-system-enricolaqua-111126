const fs = require('node:fs/promises');
const path = require('node:path');
const { STORAGE_DIRECTORY } = require('../config/storage');

const documents = new Map();

function resolveStoredPath(filename) {
  if (
    typeof filename !== 'string'
    || filename.length === 0
    || path.basename(filename) !== filename
    || path.win32.basename(filename) !== filename
  ) {
    return null;
  }

  const filePath = path.resolve(STORAGE_DIRECTORY, filename);
  const relativePath = path.relative(STORAGE_DIRECTORY, filePath);

  if (
    relativePath.length === 0
    || relativePath === '..'
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return filePath;
}

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

  const filePath = resolveStoredPath(document.storedFilename);

  if (!filePath) {
    return null;
  }

  try {
    const fileStats = await fs.lstat(filePath);

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
  const filePath = resolveStoredPath(filename);

  if (!filePath) {
    throw new Error('Nome de arquivo interno inválido.');
  }

  await fs.unlink(filePath);
}

module.exports = {
  createDocument,
  findDownloadById,
  listDocuments,
  removeStoredFile
};