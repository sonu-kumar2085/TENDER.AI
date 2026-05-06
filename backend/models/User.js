const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true },
  department: { 
    type: String, 
    required: true,
    enum: ['CRPF', 'Ministry of Defence', 'Ministry of Health', 'CPWD', 'Railways', 'Other']
  },
  role: { 
    type: String, 
    enum: ['admin', 'procurement_officer', 'viewer'], 
    default: 'procurement_officer' 
  },
  passwordHash: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

userSchema.methods.comparePassword = async function(plain) {
  return await bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
