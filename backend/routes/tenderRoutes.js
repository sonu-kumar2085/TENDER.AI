const express = require('express');
const router = express.Router();
const tenderController = require('../controllers/tenderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadSingle } = require('../middlewares/uploadMiddleware');
const proposalRoutes = require('./proposalRoutes');

router.use(authMiddleware);

router.post('/', uploadSingle, tenderController.createTender);
router.get('/', tenderController.getTenders);
router.get('/categories', tenderController.getTenderCategories);
router.get('/:tenderId', tenderController.getTenderById);
router.patch('/:tenderId/status', tenderController.updateTenderStatus);
router.delete('/:tenderId', tenderController.deleteTender);

// Admin: re-trigger ML extraction for a tender (if failed/pending)
router.post('/:tenderId/retry-extraction', tenderController.retryTenderExtraction);

// Mount nested proposal routes
router.use('/:tenderId/proposals', proposalRoutes);

module.exports = router;
