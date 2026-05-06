const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

// GET /api/auth/departments — return all unique department names
const getDepartments = async (req, res, next) => {
  try {
    const departments = await User.distinct('department');
    return sendSuccess(res, departments, 'Departments fetched');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register-department — create a new department with its admin
const registerDepartment = async (req, res, next) => {
  try {
    const { departmentName, name, employeeId, password } = req.body;

    if (!departmentName || !name || !employeeId || !password) {
      return sendError(res, 'All fields are required: departmentName, name, employeeId, password', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    // Check if department already exists
    const existingDept = await User.findOne({ department: departmentName });
    if (existingDept) {
      return sendError(res, 'Department already exists', 409);
    }

    // Check if employeeId already exists
    const existingUser = await User.findOne({ employeeId });
    if (existingUser) {
      return sendError(res, 'Employee ID already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await User.create({
      employeeId,
      name,
      department: departmentName,
      role: 'admin',
      passwordHash
    });

    const adminObj = admin.toObject();
    delete adminObj.passwordHash;

    return sendSuccess(res, adminObj, `Department "${departmentName}" created successfully with admin account`, 201);
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

module.exports = { login, getMe, logout, getDepartments, registerDepartment };
