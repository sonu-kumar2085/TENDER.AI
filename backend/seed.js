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

    // Department definitions: { key, name, adminId, officers: [{ id, name }] }
    const departments = [
      {
        name: 'CRPF',
        adminId: 'ADMIN-CRPF-0001',
        adminName: 'CRPF Admin',
        officers: [
          { id: 'CRPF-2024-0042', name: 'Rajesh Kumar' },
          { id: 'CRPF-2024-0055', name: 'Priya Sharma' }
        ]
      },
      {
        name: 'Ministry of Defence',
        adminId: 'ADMIN-MOD-0001',
        adminName: 'MoD Admin',
        officers: [
          { id: 'MOD-2024-0011', name: 'Vikram Singh' },
          { id: 'MOD-2024-0022', name: 'Anita Desai' }
        ]
      },
      {
        name: 'Ministry of Health',
        adminId: 'ADMIN-MOH-0001',
        adminName: 'MoH Admin',
        officers: [
          { id: 'MOH-2024-0031', name: 'Dr. Suresh Patel' },
          { id: 'MOH-2024-0032', name: 'Neha Gupta' }
        ]
      },
      {
        name: 'CPWD',
        adminId: 'ADMIN-CPWD-0001',
        adminName: 'CPWD Admin',
        officers: [
          { id: 'CPWD-2024-0041', name: 'Ramesh Yadav' },
          { id: 'CPWD-2024-0042', name: 'Sunita Verma' }
        ]
      },
      {
        name: 'Railways',
        adminId: 'ADMIN-RAIL-0001',
        adminName: 'Railways Admin',
        officers: [
          { id: 'RAIL-2024-0051', name: 'Amit Joshi' },
          { id: 'RAIL-2024-0052', name: 'Kavita Reddy' }
        ]
      }
    ];

    const allUsers = {};

    for (const dept of departments) {
      // Create admin
      const admin = await User.create({
        employeeId: dept.adminId,
        name: dept.adminName,
        department: dept.name,
        role: 'admin',
        passwordHash: adminPassword
      });
      allUsers[dept.adminId] = admin;
      console.log(`  Created admin: ${dept.adminId} (${dept.name})`);

      // Create officers
      for (const off of dept.officers) {
        const officer = await User.create({
          employeeId: off.id,
          name: off.name,
          department: dept.name,
          role: 'procurement_officer',
          passwordHash: officerPassword
        });
        allUsers[off.id] = officer;
        console.log(`  Created officer: ${off.id} (${dept.name})`);
      }
    }

    // Use the first CRPF officer as the tender creator for seeded tenders
    const officer1 = allUsers['CRPF-2024-0042'];

    console.log('Creating tenders...');
    const tenderTypes = ['Medical & Healthcare', 'Food & Catering', 'Construction & Infrastructure', 'Technology & IT', 'Technical & Engineering', 'Finance & Consulting'];
    
    const tenders = [];
    for (let i = 0; i < 6; i++) {
      const tender = await Tender.create({
        name: `Tender for ${tenderTypes[i]} 2025`,
        type: tenderTypes[i],
        issuingAuthority: 'CRPF HQ',
        estimatedValue: 5000000 + (i * 1000000),
        description: `Detailed procurement requirement for ${tenderTypes[i]}`,
        status: 'open',
        department: 'CRPF',
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
