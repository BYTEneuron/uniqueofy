const User = require('../models/User');
const Otp = require('../models/Otp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const otpService = require('../services/otp');


// ======================================================
// SEND OTP
// ======================================================
const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return errorResponse(res, 'Invalid phone number (10 digits required)', 'INVALID_PHONE', 400);
    }

    // Rate limit check
    const windowMinutes = parseInt(process.env.OTP_RATE_LIMIT_WINDOW) || 5;
    const maxRequests = parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3;
    const minGapSeconds = parseInt(process.env.OTP_MIN_GAP_SECONDS) || 20;
    const existingOtp = await Otp.findOne({ phone });

    let currentRequestCount = 1;
    let currentFirstRequestAt = new Date();

    if (existingOtp) {
      // A) Enforce minimum gap between requests
      const secondsSinceLast =
        (Date.now() - new Date(existingOtp.lastRequestAt).getTime()) / 1000;

      if (secondsSinceLast < minGapSeconds) {
        const retryAfter = Math.ceil(minGapSeconds - secondsSinceLast);
        return errorResponse(
          res,
          `Please wait ${retryAfter} seconds before requesting another OTP.`,
          'OTP_COOLDOWN',
          429,
          { retryAfter }
        );
      }

      // B) Enforce max requests within time window
      const elapsed = Date.now() - new Date(existingOtp.firstRequestAt).getTime();
      const windowMs = windowMinutes * 60 * 1000;

      if (elapsed < windowMs) {
        if (existingOtp.otpRequestCount >= maxRequests) {
          const retryAfter = Math.ceil((windowMs - elapsed) / 1000);
          return errorResponse(
            res,
            'Maximum OTP requests reached. Try again later.',
            'OTP_RATE_LIMIT',
            429,
            { retryAfter }
          );
        }
        currentRequestCount = existingOtp.otpRequestCount + 1;
        currentFirstRequestAt = existingOtp.firstRequestAt;
      }
      // If window expired, counters reset to defaults (1 / now)
    }

    // Remove previous OTP
    await Otp.deleteOne({ phone });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

    await Otp.create({
      phone,
      otpHash,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      attempts: 0,
      otpRequestCount: currentRequestCount,
      firstRequestAt: currentFirstRequestAt,
      lastRequestAt: new Date(),
    });

    await otpService.sendOtp(phone, otp);

    return successResponse(res, null, 'OTP sent successfully');
  } catch (error) {
    next(error);
  }
};


// ======================================================
// VERIFY OTP
// ======================================================
const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return errorResponse(res, 'Phone and OTP are required', 'MISSING_FIELDS', 400);
    }

    const otpRecord = await Otp.findOne({ phone });

    if (!otpRecord) {
      return errorResponse(res, 'OTP not found or expired', 'INVALID_OTP', 400);
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return errorResponse(res, 'OTP expired', 'OTP_EXPIRED', 400);
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;

      if (otpRecord.attempts >= maxAttempts) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return errorResponse(res, 'Max attempts reached', 'MAX_ATTEMPTS', 400);
      }

      return errorResponse(res, 'Invalid OTP', 'INVALID_OTP', 400);
    }

    // OTP verified → remove it
    await Otp.deleteOne({ _id: otpRecord._id });

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    if (!user.isActive) {
      return errorResponse(res, 'User is inactive', 'USER_INACTIVE', 403);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(
      res,
      {
        accessToken,
        user: {
          _id: user._id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      'Login successful'
    );

  } catch (error) {
    next(error);
  }
};


// ======================================================
// REFRESH TOKEN (WITH ROTATION)
// ======================================================
const refresh = async (req, res, next) => {
  try {
    if (!req.cookies || !req.cookies.refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing'
      });
    }

    const oldRefreshToken = req.cookies.refreshToken;

    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== oldRefreshToken) {
      return errorResponse(res, 'Invalid refresh token', 'INVALID_TOKEN', 403);
    }

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken(user);
    const accessToken = generateAccessToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, { accessToken }, 'Token refreshed');

  } catch (error) {
    return errorResponse(res, 'Invalid or expired refresh token', 'INVALID_TOKEN', 403);
  }
};


// ======================================================
// LOGOUT
// ======================================================
const logout = async (req, res, next) => {
  try {
    if (!req.cookies || !req.cookies.refreshToken) {
      return res.status(200).json({
        success: true,
        message: 'Already logged out'
      });
    }

    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (decoded?.id) {
          await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
        }
      } catch (err) {
        // If token is invalid or expired, proceed to clear cookie anyway
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return successResponse(res, null, 'Logged out successfully');

  } catch (error) {
    next(error);
  }
};


// ======================================================
// GET CURRENT USER
// ======================================================
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-refreshToken');

    return successResponse(res, user, 'User profile retrieved');

  } catch (error) {
    next(error);
  }
};


// Format name to Proper Case
const formatName = (name) => {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};




// ======================================================
// UPDATE USER PROFILE
// ======================================================
const updateProfile = async (req, res, next) => {
  try {
    let { firstName, lastName } = req.body;

    // Trim + normalize casing
    firstName = formatName(firstName);
    lastName = formatName(lastName);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName },
      { new: true, runValidators: true }
    ).select('-refreshToken');

    if (!updatedUser) {
      return errorResponse(res, 'User not found', 'USER_NOT_FOUND', 404);
    }

    return successResponse(
      res,
      updatedUser,
      'Profile updated successfully'
    );

  } catch (error) {
    next(error);
  }
};



module.exports = {
  sendOtp,
  verifyOtp,
  refresh,
  logout,
  getMe,
  updateProfile
};
