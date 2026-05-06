const mongoose = require('mongoose');
const Counter = require('./Counter');

const proposalSchema = new mongoose.Schema({
  proposalId: { type: String, unique: true },
  tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
  companyName: { type: String, required: true },
  companyRegistrationNo: { type: String, required: true },
  contactPersonName: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  bidValue: { type: Number, required: true }, // integer INR
  isMsmeRegistered: { type: Boolean, default: false },
  proposalDocuments: [{
    fileName: String,
    documentType: String,
    cloudinaryUrl: String,
    cloudinaryPublicId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  extractedData: { type: mongoose.Schema.Types.Mixed, default: null },
  mlExtractionStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  mlExtractionError: { type: String, default: null },
  analysisResult: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis', default: null },
  officerDecision: {
    decision: { type: String, enum: ['eligible', 'rejected', 'clarification_requested', null], default: null },
    remarks: { type: String, default: null },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null }
  },
  submissionTime: { type: Date, default: Date.now },
  rank: { type: Number, default: null }
});

proposalSchema.pre('save', async function() {
  if (this.isNew && !this.proposalId) {
    const counter = await Counter.findOneAndUpdate(
      { key: 'proposal' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    // We need tenderId for PRO-<tenderId>-XXXX format
    await this.populate('tender', 'tenderId');
    const tenderId = this.tender ? this.tender.tenderId : 'UNKNOWN';
    this.proposalId = `PRO-${tenderId}-${String(counter.seq).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Proposal', proposalSchema);
