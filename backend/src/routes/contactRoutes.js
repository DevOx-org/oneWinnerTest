const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

// POST /api/contact — public endpoint for contact form submissions
router.post('/', submitContactForm);

module.exports = router;
