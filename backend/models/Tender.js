const mongoose = require('mongoose');
const Counter = require('./Counter');

const tenderSchema = new mongoose.Schema({
  tenderId: { type: String, unique: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['Medical & Healthcare', 'Food & Catering', 'Construction & Infrastructure', 'Technology & IT', 'Technical & Engineering', 'Finance & Consulting']
  },
  issuingAuthority: { type: String, required: true },
  estimatedValue: { type: Number, required: true }, // integer INR
  description: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'open', 'closed', 'awarded', 'cancelled'], 
    default: 'open' 
  },
  tenderPdfUrl: { type: String },
  tenderPdfPublicId: { type: String },
  extractedData: { type: mongoose.Schema.Types.Mixed, default: null },
  mlExtractionStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  mlExtractionError: { type: String, default: null },
  department: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

tenderSchema.pre('save', async function() {
  if (this.isNew && !this.tenderId) {
    const counter = await Counter.findOneAndUpdate(
      { key: 'tender' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const year = new Date().getFullYear();
    this.tenderId = `TND-${year}-${String(counter.seq).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Tender', tenderSchema);
