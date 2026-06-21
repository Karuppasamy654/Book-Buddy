const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => String(r).toLowerCase());
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role ${req.user.role} is not authorized to access this resource.`
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (user) {
          req.user = user;
        }
      } catch (error) {
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const checkOwnership = (resourceUserIdField = 'user') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

const checkHotelAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }

    const hotelId = req.params.hotelId || req.body.hotelId || req.query.hotelId;
    
    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID is required.'
      });
    }

    const Hotel = require('../models/Hotel');
    const hotel = await Hotel.findById(hotelId);
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found.'
      });
    }

    if (hotel.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to manage this hotel.'
      });
    }

    req.hotel = hotel;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking hotel access.'
    });
  }
};

const createRateLimit = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

let loginRateLimit;
if (process.env.NODE_ENV === 'production') {
  loginRateLimit = createRateLimit(
    5 * 60 * 1000, 
    10, 
    'Too many login attempts, please try again after 5 minutes.'
  );
} else {
  loginRateLimit = (req, res, next) => next();
}

let passwordResetRateLimit;
if (process.env.NODE_ENV === 'production') {
  passwordResetRateLimit = createRateLimit(
    60 * 60 * 1000, 
    3, 
    'Too many password reset attempts, please try again after 1 hour.'
  );
} else {
  passwordResetRateLimit = (req, res, next) => next();
}

let registrationRateLimit;
if (process.env.NODE_ENV === 'production') {
  registrationRateLimit = createRateLimit(
    60 * 60 * 1000, 
    3, 
    'Too many registration attempts, please try again after 1 hour.'
  );
} else {
  registrationRateLimit = (req, res, next) => next();
}

module.exports = {
  protect,
  authorize,
  optionalAuth,
  checkOwnership,
  checkHotelAccess,
  loginRateLimit,
  passwordResetRateLimit,
  registrationRateLimit
};
