const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officerController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', officerController.getOfficers);
router.post('/', officerController.addOfficer);
router.delete('/:employeeId', officerController.deleteOfficer);

module.exports = router;
