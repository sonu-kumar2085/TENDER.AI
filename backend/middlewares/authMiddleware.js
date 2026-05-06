const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/responseHelper');

const authMiddleware = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Not authorized, token missing', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return sendError(res, 'User not found', 401);
    }
    
    if (!user.isActive) {
      return sendError(res, 'Account is inactive. Please contact administrator.', 403);
    }

    req.user = {
      userId: user._id,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Not authorized, token expired', 401);
    }
    return sendError(res, 'Not authorized, token failed', 401);
  }
};

module.exports = authMiddleware;
