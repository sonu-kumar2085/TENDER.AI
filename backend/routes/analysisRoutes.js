const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// We use /tender/:tenderId/fraud-report to match requirements, though it's in analysis routes
router.get('/tender/:tenderId/fraud-report', analysisController.getFraudReportByTenderId);
router.get('/:proposalId', analysisController.getAnalysisByProposalId);
router.post('/:proposalId/retry', analysisController.retryAnalysis);

module.exports = router;
