const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// GET /api/officers — list procurement officers in admin's department
const getOfficers = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }

    const officers = await User.find({
      department: req.user.department,
      role: 'procurement_officer'
    })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return sendSuccess(res, officers, 'Officers fetched successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/officers — add a new procurement officer to admin's department
const addOfficer = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }

    const { name, employeeId, password } = req.body;

    if (!name || !employeeId || !password) {
      return sendError(res, 'Name, Employee ID, and Password are required', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    // Check if employeeId already exists
    const existing = await User.findOne({ employeeId });
    if (existing) {
      return sendError(res, 'Employee ID already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const officer = await User.create({
      employeeId,
      name,
      department: req.user.department,
      role: 'procurement_officer',
      passwordHash
    });

    // Return without passwordHash
    const officerObj = officer.toObject();
    delete officerObj.passwordHash;

    return sendSuccess(res, officerObj, 'Officer added successfully', 201);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/officers/:employeeId — deactivate an officer in admin's department
const deleteOfficer = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Admin privileges required', 403);
    }

    const { employeeId } = req.params;

    const officer = await User.findOne({
      employeeId,
      department: req.user.department,
      role: 'procurement_officer'
    });

    if (!officer) {
      return sendError(res, 'Officer not found in your department', 404);
    }

    // Hard delete the officer
    await User.findByIdAndDelete(officer._id);

    return sendSuccess(res, null, 'Officer deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getOfficers, addOfficer, deleteOfficer };
