const multer = require('multer');
const { randomUUID } = require('node:crypto');
const { MAX_FILE_SIZE_BYTES, STORAGE_DIRECTORY } = require('../config/storage');

const STORAGE_ERROR_CODES = new Set(['EACCES', 'EIO', 'EMFILE', 'ENFILE', 'ENOENT', 'ENOSPC', 'EROFS']);

const upload = multer({
  storage: multer.diskStorage({
    destination: STORAGE_DIRECTORY,
    filename: (_req, _file, callback) => callback(null, randomUUID())
  }),
  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(createUploadError(413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.'));
    }

    if (STORAGE_ERROR_CODES.has(error.code)) {
      return next(createUploadError(500, 'STORAGE_ERROR', 'Não foi possível gravar o arquivo.'));
    }

    return next(createUploadError(400, 'INVALID_MULTIPART', 'A requisição de upload é inválida.'));
  });
}

function createUploadError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

module.exports = handleUpload;