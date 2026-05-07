/**
 * clearStaleAnalyses.js
 * ─────────────────────
 * One-time utility: deletes ALL stored Analysis records and resets
 * Proposal.analysisResult pointers so the ML pipeline re-runs with
 * the new human-readable criterion names (instead of C1, C2, …).
 *
 * Run once from the backend/ directory:
 *   node scripts/clearStaleAnalyses.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const Proposal = require('../models/Proposal');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // 1. Delete all Analysis documents
  const { deletedCount } = await Analysis.deleteMany({});
  console.log(`🗑   Deleted ${deletedCount} Analysis record(s)`);

  // 2. Reset analysisResult pointer on all Proposals
  const { modifiedCount } = await Proposal.updateMany(
    { analysisResult: { $ne: null } },
    { $set: { analysisResult: null } }
  );
  console.log(`🔄  Reset analysisResult on ${modifiedCount} Proposal(s)`);

  console.log('');
  console.log('✅  Done! All proposals now need re-analysis.');
  console.log('   Go to each Proposal\'s Detail page and click "Re-analyze",');
  console.log('   OR re-submit the proposals to trigger the full pipeline.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌  Script failed:', err.message);
  process.exit(1);
});
