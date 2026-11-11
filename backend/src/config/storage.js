const fs = require('node:fs');
const path = require('node:path');

const STORAGE_DIRECTORY = path.resolve(__dirname, '../../storage');
const MAX_FILE_SIZE_MB = Number(process.env.DMS_MAX_FILE_SIZE_MB ?? 10);
const MAX_FILE_SIZE_BYTES = Math.floor(MAX_FILE_SIZE_MB * 1024 * 1024);

if (!Number.isFinite(MAX_FILE_SIZE_MB) || !Number.isSafeInteger(MAX_FILE_SIZE_BYTES) || MAX_FILE_SIZE_BYTES < 1) {
  throw new Error('DMS_MAX_FILE_SIZE_MB deve ser um número positivo válido.');
}

fs.mkdirSync(STORAGE_DIRECTORY, { recursive: true });

module.exports = {
  MAX_FILE_SIZE_BYTES,
  STORAGE_DIRECTORY
};