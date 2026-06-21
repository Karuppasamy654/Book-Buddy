const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { protect, loginRateLimit, passwordResetRateLimit, registrationRateLimit } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadSingle } = require('../middleware/upload');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

const resetStore = new Map();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

router.post('/register', 
  registrationRateLimit,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone_number').optional().matches(/^[0-9+\-()\s]{8,}$/).withMessage('Please provide a valid phone number')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password, phone_number = null } = req.body;
    const role = 'Customer';

    const existing = await User.findOne({ where: { email }, attributes: ['user_id'] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, password_hash, password_plain_tmp: password, role, phone_number });

    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await user.update({ emailVerificationToken: verificationToken, emailVerificationExpire: new Date(Date.now() + 24*60*60*1000) });
      const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
      const emailHtml = `
        <h2>Welcome to BookBuddy!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="background-color: #f56e14; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `;
      await sendEmail(email, 'Verify Your Email - BookBuddy', emailHtml);
    } catch (e) {
      console.warn('Verification email skipped or failed:', e.message);
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
      token
    });
  })
);

router.post('/login',
  loginRateLimit,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ 
      where: { email },
      attributes: ['user_id','name','email','password_hash','role','phone_number', 'hotel_id']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const bcrypt = require('bcryptjs');
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const userData = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number
    };

    res.json({ success: true, message: 'Login successful', user: userData, token });
  })
);

router.get('/verify-email/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpire: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpire: null
    });

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

router.delete('/delete-account', protect, asyncHandler(async (req, res) => {
  const { sequelize, UserArchive } = require('../models');
  const qi = sequelize.getQueryInterface();
  let archiveTableExists = false;
  try {
    await qi.describeTable('user_archive');
    archiveTableExists = true;
  } catch (_) {
    archiveTableExists = false;
  }

  if (!archiveTableExists) {
    try {
      const user = await User.findByPk(req.user.user_id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      await user.destroy();
      return res.json({ success: true, message: 'Account deleted successfully' });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to delete account', error: e.message });
    }
  }

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.user_id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let archived = false;
    if (UserArchive && typeof UserArchive.create === 'function') {
      try {
        await UserArchive.create({
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone_number: user.phone_number
        }, { transaction: t });
        archived = true;
      } catch (archiveErr) {
        console.warn('User archive failed, proceeding with delete only:', archiveErr.message);
      }
    }

    if (archived) {
      const { Booking, FoodOrder, OrderDetail, AssignedTask } = require('../models');
      const { Op } = require('sequelize');
      const bookings = await Booking.findAll({
        where: { user_id: user.user_id },
        attributes: ['booking_id'],
        transaction: t
      });
      const bookingIds = bookings.map(b => b.booking_id);
      if (bookingIds.length) {
        const orders = await FoodOrder.findAll({
          where: { booking_id: { [Op.in]: bookingIds } },
          attributes: ['order_id'],
          transaction: t
        });
        const orderIds = orders.map(o => o.order_id);
        if (orderIds.length) {
          await OrderDetail.destroy({ where: { order_id: { [Op.in]: orderIds } }, transaction: t });
        }
        await FoodOrder.destroy({ where: { booking_id: { [Op.in]: bookingIds } }, transaction: t });
        await Booking.destroy({ where: { user_id: user.user_id }, transaction: t });
      }
      await AssignedTask.destroy({ where: { staff_id: user.user_id }, transaction: t });

      await user.destroy({ transaction: t });
      await t.commit();
      return res.json({ success: true, message: 'Account deleted and archived successfully' });
    } else {
      try { await t.rollback(); } catch (_) {}
      const fresh = await User.findByPk(user.user_id);
      if (!fresh) {
        return res.json({ success: true, message: 'Account deleted successfully' });
      }
      const { Booking, FoodOrder, OrderDetail, AssignedTask } = require('../models');
      const { Op } = require('sequelize');
      const bookings = await Booking.findAll({
        where: { user_id: fresh.user_id },
        attributes: ['booking_id']
      });
      const bookingIds = bookings.map(b => b.booking_id);
      if (bookingIds.length) {
        const orders = await FoodOrder.findAll({
          where: { booking_id: { [Op.in]: bookingIds } },
          attributes: ['order_id']
        });
        const orderIds = orders.map(o => o.order_id);
        if (orderIds.length) {
          await OrderDetail.destroy({ where: { order_id: { [Op.in]: orderIds } } });
        }
        await FoodOrder.destroy({ where: { booking_id: { [Op.in]: bookingIds } } });
        await Booking.destroy({ where: { user_id: fresh.user_id } });
      }
      await AssignedTask.destroy({ where: { staff_id: fresh.user_id } });
      await fresh.destroy();
      return res.json({ success: true, message: 'Account deleted successfully' });
    }
  } catch (e) {
    try { await t.rollback(); } catch (_) {}
    return res.status(500).json({ success: false, message: 'Failed to delete account', error: e.message });
  }
}));

router.post('/resend-verification',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ where: { email }, attributes: ['user_id','email'] });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await user.update({
      emailVerificationToken: verificationToken,
      emailVerificationExpire: verificationExpire
    });

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
    const emailHtml = `
      <h2>Verify Your Email - BookBuddy</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="background-color: #f56e14; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail(email, 'Verify Your Email - BookBuddy', emailHtml);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  })
);

router.post('/forgot-password',
  passwordResetRateLimit,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (process.env.NODE_ENV !== 'production') {
      resetStore.set(resetToken, { user_id: user.user_id, expire: resetExpire });
    } else {
      await user.update({ passwordResetToken: resetToken, passwordResetExpire: resetExpire });
    }

    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
    const emailHtml = `
      <h2>Password Reset - BookBuddy</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #f56e14; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const sent = await sendEmail(email, 'Password Reset - BookBuddy', emailHtml);

    const response = {
      success: true,
      message: 'Password reset email sent successfully'
    };

    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken;
      response.resetUrl = resetUrl;
      response.emailSent = !!sent;
    }

    res.json(response);
  })
);

router.post('/reset-password/:token',
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    let user = null;
    if (process.env.NODE_ENV !== 'production') {
      const entry = resetStore.get(token);
      if (!entry || entry.expire <= new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }
      user = await User.findOne({ where: { user_id: entry.user_id }, attributes: ['user_id','email'] });
      resetStore.delete(token);
    } else {
      user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpire: { [require('sequelize').Op.gt]: new Date() }
        }
      });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    if (process.env.NODE_ENV !== 'production') {
      await user.update({ password_hash: hashedPassword, password_plain_tmp: password });
    } else {
      await user.update({ password_hash: hashedPassword, password_plain_tmp: password, passwordResetToken: null, passwordResetExpire: null });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  })
);

router.get('/me', protect, asyncHandler(async (req, res) => {
  let dbUser = null;
  try {
    dbUser = await User.findByPk(req.user.user_id, {
      attributes: ['user_id','name','email','role','phone_number']
    });
  } catch (_) {}

  const user = dbUser ? dbUser.toJSON() : {
    user_id: req.user.user_id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    phone_number: req.user.phone_number
  };

  res.json({ success: true, data: { user } });
}));

router.put('/profile',
  protect,
  uploadSingle('avatar'),
  [
    body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
    body('phone').optional().matches(/^[6-9]\d{9}$/),
    body('address.street').optional().trim(),
    body('address.city').optional().trim(),
    body('address.state').optional().trim(),
    body('address.pincode').optional().matches(/^\d{6}$/),
    body('preferences.language').optional().isIn(['en', 'hi', 'ta', 'te'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = ['firstName', 'lastName', 'phone', 'address', 'preferences'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.file) {
      updates.avatar = req.file.url;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  })
);

router.put('/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

router.post('/logout', protect, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await req.user.removeRefreshToken(refreshToken);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.some(token => token.token === refreshToken)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const newToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    await user.removeRefreshToken(refreshToken);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
}));

module.exports = router;
