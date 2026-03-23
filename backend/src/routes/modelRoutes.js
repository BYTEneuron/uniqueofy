const express = require('express');
const router = express.Router();
const { getCurrentModel } = require('../controllers/modelController');

/**
 * @route   GET /api/model/current
 * @desc    Get current AI model information
 * @access  Public
 */
router.get('/current', getCurrentModel);

module.exports = router;
