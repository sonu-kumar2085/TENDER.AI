require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');
const Tender = require('./models/Tender');
const Proposal = require('./models/Proposal');
const Analysis = require('./models/Analysis');
const Counter = require('./models/Counter');

const seedDB = async () => {
  try {
    await connectDB();
    console.log('Clearing collections...');
    await User.deleteMany({});
    await Tender.deleteMany({});
    await Proposal.deleteMany({});
    await Analysis.deleteMany({});
    await Counter.deleteMany({});

    console.log('Creating users...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@1234', salt);
    const officerPassword = await bcrypt.hash('Officer@1234', salt);

    const admin = await User.create({
      employeeId: 'ADMIN-0001',
      name: 'Admin User',
      department: 'CRPF',
      role: 'admin',
      passwordHash: adminPassword
    });

    const officer1 = await User.create({
      employeeId: 'CRPF-2024-0042',
      name: 'Rajesh Kumar',
      department: 'CRPF',
      role: 'procurement_officer',
      passwordHash: officerPassword
    });

    const officer2 = await User.create({
      employeeId: 'CRPF-2024-0055',
      name: 'Priya Sharma',
      department: 'CRPF',
      role: 'procurement_officer',
      passwordHash: officerPassword
    });

    console.log('Creating tenders...');
    const tenderTypes = ['Medical & Healthcare', 'Food & Catering', 'Construction & Infrastructure', 'Technology & IT', 'Technical & Engineering', 'Finance & Consulting'];
    
    const tenders = [];
    for (let i = 0; i < 6; i++) {
      const tender = await Tender.create({
        name: `Tender for ${tenderTypes[i]} 2025`,
        type: tenderTypes[i],
        issuingAuthority: 'CRPF HQ',
        submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        estimatedValue: 5000000 + (i * 1000000),
        description: `Detailed procurement requirement for ${tenderTypes[i]}`,
        status: 'open',
        createdBy: officer1._id,
        mlExtractionStatus: 'completed',
        extractedData: {
          eligibilityCriteria: ["Must have 3 years experience", "Minimum turnover 1 Cr"],
          requiredDocuments: ["ISO Cert", "GST", "EMD"],
          clauses: ["Clause 1", "Clause 2"],
          rawText: "Mock extraction text..."
        }
      });
      tenders.push(tender);
    }

    console.log('Creating proposals and analysis...');
    
    for (const tender of tenders) {
      for (let j = 0; j < 5; j++) {
        const isFraud = j === 4;
        const bidValue = tender.estimatedValue * (0.9 + (Math.random() * 0.2));
        
        const proposal = await Proposal.create({
          tender: tender._id,
          companyName: `Vendor Corp ${j+1} - ${tender.type.substring(0,4)}`,
          companyRegistrationNo: `U74999DL2015PTC${10000+j}`,
          contactPersonName: `Person ${j+1}`,
          contactEmail: `contact${j+1}@vendor.com`,
          contactPhone: `987654321${j}`,
          bidValue: Math.round(bidValue),
          isMsmeRegistered: j % 2 === 0,
          mlExtractionStatus: 'completed',
          extractedData: { turnover: 12000000, msmeNumber: `UDYAM-1234-${j}` }
        });

        const overallResult = j === 0 ? 'eligible' : j === 1 ? 'rejected' : 'manual_review';
        const confScore = j === 0 ? 0.95 : j === 1 ? 0.45 : 0.70;

        const fraudFlags = isFraud ? [{
          flagType: 'IDENTICAL_BID_VALUES',
          description: 'Bid value suspiciously identical to another company',
          affectedProposals: [proposal._id],
          severity: 'high'
        }] : [];

        const analysis = await Analysis.create({
          proposal: proposal._id,
          tender: tender._id,
          overallResult,
          confidenceScore: confScore,
          ambiguityScore: 1 - confScore,
          matchedCriteria: [{
            criterionName: "Annual Turnover",
            required: "min ₹1 Cr",
            extracted: "₹1.2 Cr",
            sourceDocument: "Audit PDF",
            sourcePage: "2",
            confidence: 0.9,
            clauseReference: "Clause 4.2",
            aiExplanation: "Turnover meets requirement"
          }],
          unmatchedCriteria: overallResult === 'rejected' ? [{
            criterionName: "ISO Cert",
            required: "ISO 13485",
            found: "ISO 9001",
            sourceDocument: "ISO PDF",
            sourcePage: "1",
            clauseReference: "Clause 6",
            rejectionReason: "Wrong ISO Type",
            evidenceTrace: []
          }] : [],
          manualReviewItems: overallResult === 'manual_review' ? [{
            itemName: "Director Signature",
            expected: "Clear Signature",
            systemExtracted: "Blurry Scan",
            extractionConfidence: 0.55,
            reasonForLowConfidence: "Low DPI scan",
            sourceDocument: "Declaration PDF",
            sourcePage: "1"
          }] : [],
          fraudFlags,
          mlAnalysisStatus: 'completed',
          auditHash: 'mock_hash_' + proposal._id
        });

        proposal.analysisResult = analysis._id;
        proposal.rank = j + 1; // dummy rank
        await proposal.save();
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
