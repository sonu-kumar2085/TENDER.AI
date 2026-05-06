const express = require('express');
const router = express.Router({ mergeParams: true });
const proposalController = require('../controllers/proposalController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadMultiple } = require('../middlewares/uploadMiddleware');

router.use(authMiddleware);

// These require tenderId from parent router (/api/tenders/:tenderId/proposals)
router.post('/', uploadMultiple, proposalController.createProposal);
router.get('/', proposalController.getProposalsByTender);

// These will be mounted at /api/proposals
router.get('/:proposalId', proposalController.getProposalById);
router.patch('/:proposalId/decision', proposalController.makeDecision);
router.patch('/:proposalId/review-item', proposalController.reviewItem);

module.exports = router;
