const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const login = async (req, res, next) => {
  try {
    const { employeeId, password, department } = req.body;

    const user = await User.findOne({ employeeId });
    if (!user || !user.isActive) {
      return sendError(res, 'Invalid credentials or inactive account', 401);
    }

    if (user.department !== department) {
      return sendError(res, 'Department mismatch', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, employeeId: user.employeeId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const officer = {
      employeeId: user.employeeId,
      name: user.name,
      department: user.department,
      role: user.role,
      lastLogin: user.lastLogin
    };

    return sendSuccess(res, { token, officer }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, logout };
