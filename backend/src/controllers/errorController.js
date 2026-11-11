function handleError(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (Number.isInteger(error.statusCode) && typeof error.code === 'string') {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'O corpo da requisição deve ser um JSON válido.'
      }
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: 'O corpo da requisição excede o limite permitido.'
      }
    });
  }

  console.error(error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno.'
    }
  });
}

module.exports = handleError;