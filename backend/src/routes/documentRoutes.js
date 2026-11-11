const express = require('express');
const documentController = require('../controllers/documentController');
const authenticate = require('../middleware/authenticate');
const handleUpload = require('./uploadMiddleware');

const router = express.Router();

router.use(authenticate);
router.post('/upload', handleUpload, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;