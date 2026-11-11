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

  console.error(error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno.'
    }
  });
}

module.exports = handleError;