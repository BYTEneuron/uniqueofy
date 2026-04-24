const express = require('express');
const { sendOtp, verifyOtp, refresh, logout, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { sendOtpSchema, verifyOtpSchema, updateProfileSchema } = require('../validators/authSchemas');

const router = express.Router();

router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);

module.exports = router;
