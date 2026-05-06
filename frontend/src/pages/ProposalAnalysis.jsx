import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Download, CheckCircle2, XCircle, AlertTriangle, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const ProposalAnalysis = () => {
  const { tenderId, proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [tender, setTender] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const [expandedTabs, setExpandedTabs] = useState({ matched: true, unmatched: true, manual: true });
  const [decision, setDecision] = useState('');
  const [justification, setJustification] = useState('');
  const [finalAction, setFinalAction] = useState('');
  const [finalRemarks, setFinalRemarks] = useState('');

  const toggleTab = (tab) => setExpandedTabs(prev => ({ ...prev, [tab]: !prev[tab] }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proposalRes, tenderRes, analysisRes] = await Promise.all([
          fetch(`http://localhost:5000/api/proposals/${proposalId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/tenders/${tenderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/analysis/${proposalId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const proposalData = await proposalRes.json();
        const tenderData = await tenderRes.json();
        const analysisData = await analysisRes.json();

        if (proposalData.success) setProposal(proposalData.data);
        if (tenderData.success) setTender(tenderData.data);
        if (analysisData.success) setAnalysis(analysisData.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [proposalId, tenderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-government-bg">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <RefreshCw className="animate-spin text-government-primary" size={36} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex flex-col bg-government-bg">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-government-textMuted">Proposal not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const result = analysis?.overallResult || 'manual_review';
  const confidence = analysis?.confidenceScore ?? 0;
  const matched = analysis?.matchedCriteria || [];
  const unmatched = analysis?.unmatchedCriteria || [];
  const manualReview = analysis?.manualReviewItems || [];
  const hasFraud = analysis?.fraudFlags?.length > 0;

  const breadcrumbs = (
    <div className="flex items-center gap-2">
      <Link to="/dashboard" className="hover:text-government-primary transition-colors">Home</Link>
      <span>&gt;</span>
      <span>{tender?.type}</span>
      <span>&gt;</span>
      <Link to={`/tender/${tenderId}`} className="hover:text-government-primary transition-colors">{tender?.name}</Link>
      <span>&gt;</span>
      <span className="text-government-primaryDark font-medium">{proposal.companyName}</span>
    </div>
  );

  let badge = null;
  if (result === 'eligible') {
    badge = <span className="bg-government-eligibleBg text-government-eligibleGreen font-bold px-3 py-1 rounded-chip border border-green-200 flex items-center gap-1"><CheckCircle2 size={16}/> ELIGIBLE</span>;
  } else if (result === 'rejected') {
    badge = <span className="bg-government-rejectedBg text-government-rejectedRed font-bold px-3 py-1 rounded-chip border border-red-200 flex items-center gap-1"><XCircle size={16}/> REJECTED</span>;
  } else {
    badge = <span className="bg-government-reviewBg text-government-reviewAmber font-bold px-3 py-1 rounded-chip border border-orange-200 flex items-center gap-1"><AlertTriangle size={16}/> MANUAL REVIEW</span>;
  }

  const confColor = confidence >= 0.8 ? 'bg-government-eligibleGreen' : confidence >= 0.5 ? 'bg-government-reviewAmber' : 'bg-government-rejectedRed';

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar breadcrumbs={breadcrumbs} />

      <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-6 sm:px-12 space-y-8">
        
        <div className="bg-white rounded-card shadow-card border border-government-border border-l-4 border-l-government-primary p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-government-primaryDark leading-tight">
              {proposal.companyName}
              {hasFraud && <span className="ml-3 bg-government-rejectedRed text-white text-sm px-2 py-0.5 rounded font-bold">⚠ Fraud Risk</span>}
            </h1>
            {badge}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-government-textMuted mb-1">Company Reg No</p>
              <p className="font-mono text-government-monospace font-medium">{proposal.companyRegistrationNo}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Submission Time</p>
              <p className="font-mono text-government-textPrimary font-medium">
                {proposal.submissionTime ? new Date(proposal.submissionTime).toLocaleString('en-IN') : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Bid Value</p>
              <p className="font-medium text-government-textPrimary">₹ {proposal.bidValue?.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Confidence Score</p>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${confColor}`} style={{ width: `${confidence * 100}%` }}></div>
                </div>
                <span className="font-mono text-sm">{confidence.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">MSME Status</p>
              <p className="font-medium">
                {proposal.isMsmeRegistered ? 
                  <span className="bg-government-primaryPale text-government-primary px-2 py-0.5 rounded text-sm">Registered</span> : 
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">Not Registered</span>
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Rank</p>
              <p className="font-medium text-government-textPrimary">#{proposal.rank ?? '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 pt-4 border-t border-government-border">
            <button className="flex items-center gap-2 px-4 py-2 text-government-primary border border-government-primary hover:bg-government-surfaceHover rounded-btn font-medium transition-colors">
              <Download size={18} />
              Download Proposal PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => toggleTab('matched')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${expandedTabs.matched ? 'bg-government-primary text-white' : 'bg-white text-government-textPrimary border border-government-border'}`}>
            Matched ({matched.length})
            {expandedTabs.matched ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          <button onClick={() => toggleTab('unmatched')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${expandedTabs.unmatched ? 'bg-government-rejectedRed text-white' : 'bg-white text-government-textPrimary border border-government-border'}`}>
            Unmatched ({unmatched.length})
            {expandedTabs.unmatched ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          <button onClick={() => toggleTab('manual')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${expandedTabs.manual ? 'bg-government-reviewAmber text-white' : 'bg-white text-government-textPrimary border border-government-border'}`}>
            Manual Review Needed ({manualReview.length})
            {expandedTabs.manual ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>

        <div className="space-y-6">
          {expandedTabs.matched && matched.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-government-eligibleGreen border-b border-green-200 pb-2">
                Matched Criteria — {matched.length} requirements satisfied
              </h2>
              {matched.map((item, idx) => (
                <div key={idx} className="bg-white rounded-card shadow-sm border border-government-border border-l-4 border-l-government-eligibleGreen p-4">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-semibold text-government-textPrimary">{item.criterionName}</h3>
                    <span className="bg-government-eligibleBg text-government-eligibleGreen text-xs font-bold px-2 py-1 rounded">✓ MET</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-government-textMuted block">Required:</span>
                      <span className="font-medium">{item.required}</span>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Extracted:</span>
                      <span className="font-medium text-government-eligibleGreen">{item.extracted}</span>
                      <div className="text-xs text-government-textMuted mt-1">Source: {item.sourceDocument} (pg. {item.sourcePage})</div>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Confidence:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className="bg-government-eligibleGreen h-1.5 rounded-full" style={{width: `${(item.confidence ?? 0) * 100}%`}}></div></div>
                        <span className="font-mono text-xs">{item.confidence?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Clause Reference:</span>
                      <span className="font-serif text-government-primaryDark">{item.clauseReference}</span>
                    </div>
                  </div>
                  {item.aiExplanation && (
                    <div className="bg-[#E3F2FD] rounded p-3 text-sm">
                      <span className="text-xs font-bold text-[#1565C0] block mb-1">AI ANALYSIS</span>
                      <p className="text-government-textPrimary">{item.aiExplanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {expandedTabs.unmatched && unmatched.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-government-rejectedRed border-b border-red-200 pb-2">
                Unmatched Criteria — {unmatched.length} requirements not satisfied
              </h2>
              {unmatched.map((item, idx) => (
                <div key={idx} className="bg-white rounded-card shadow-sm border border-government-border border-l-4 border-l-government-rejectedRed p-4">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-semibold text-government-textPrimary">{item.criterionName}</h3>
                    <span className="bg-government-rejectedBg text-government-rejectedRed text-xs font-bold px-2 py-1 rounded">✗ FAILED</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-government-textMuted block">Required:</span>
                      <span className="font-medium">{item.required}</span>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Found:</span>
                      <span className="font-medium text-government-rejectedRed">{item.found}</span>
                      <div className="text-xs text-government-textMuted mt-1">Source: {item.sourceDocument} (pg. {item.sourcePage})</div>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Clause Reference:</span>
                      <span className="font-serif text-government-primaryDark">{item.clauseReference}</span>
                    </div>
                  </div>
                  <div className="bg-[#FFEBEE] rounded p-3 text-sm">
                    <span className="text-xs font-bold text-[#C62828] block mb-1">REJECTION REASON</span>
                    <p className="text-government-textPrimary">{item.rejectionReason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expandedTabs.manual && manualReview.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-government-reviewAmber border-b border-orange-200 pb-2">
                Manual Review Required — {manualReview.length} items need officer verification
              </h2>
              {manualReview.map((item, idx) => (
                <div key={idx} className="bg-white rounded-card shadow-sm border border-government-border border-l-4 border-l-government-reviewAmber p-4">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-semibold text-government-textPrimary">{item.itemName}</h3>
                    <span className="bg-government-reviewBg text-government-reviewAmber text-xs font-bold px-2 py-1 rounded">⚠ MANUAL REVIEW</span>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-government-textMuted block">Expected:</span>
                          <span className="font-medium">{item.expected}</span>
                        </div>
                        <div>
                          <span className="text-government-textMuted block">System Extracted:</span>
                          <span className="font-medium text-government-reviewAmber">{item.systemExtracted} (Conf: {item.extractionConfidence})</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-government-textMuted block text-sm mb-1">Reason for Low Confidence:</span>
                        <div className="text-sm font-medium text-government-textPrimary bg-[#FFF3E0] p-2 rounded">{item.reasonForLowConfidence}</div>
                      </div>
                      <div>
                        <span className="text-government-textMuted block text-sm mb-1">Source:</span>
                        <span className="text-sm">{item.sourceDocument} (pg. {item.sourcePage})</span>
                      </div>
                    </div>
                    <div className="w-full lg:w-64 bg-gray-50 border border-government-border rounded flex flex-col items-center justify-center p-4">
                      <FileText size={48} className="text-gray-300 mb-2" />
                      <span className="text-xs text-government-textMuted text-center">Document preview unavailable.</span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-government-border pt-4">
                    <h4 className="text-sm font-bold text-government-textPrimary mb-3">Your Decision</h4>
                    <div className="flex gap-6 mb-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`decision-${idx}`} value="accept" className="text-government-primary focus:ring-government-primary h-4 w-4" onChange={(e) => setDecision(e.target.value)} />
                        Accept
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`decision-${idx}`} value="reject" className="text-government-rejectedRed focus:ring-government-rejectedRed h-4 w-4" onChange={(e) => setDecision(e.target.value)} />
                        Reject
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name={`decision-${idx}`} value="clarify" className="text-government-reviewAmber focus:ring-government-reviewAmber h-4 w-4" onChange={(e) => setDecision(e.target.value)} />
                        Request Clarification from Vendor
                      </label>
                    </div>
                    <textarea 
                      className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm mb-3" 
                      rows="2" 
                      placeholder="Justification (mandatory)"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    ></textarea>
                    <button 
                      disabled={justification.length < 20 || !decision}
                      className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-btn font-medium transition-colors text-sm"
                    >
                      Save Decision
                    </button>
                    <p className="text-xs text-government-textMuted mt-2">
                      ⚠ This decision will be permanently recorded in the audit trail with your officer ID and timestamp
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-government-eligibleBg border-2 border-government-primary rounded-card p-6 mt-8">
          <h2 className="text-xl font-bold text-government-primaryDark mb-1">Final Evaluation Decision</h2>
          <p className="text-sm text-government-textSecondary mb-6">This action is irreversible. Ensure all manual reviews above are completed before proceeding.</p>

          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <button 
              onClick={() => setFinalAction('approve')}
              className={`flex-1 py-3 px-4 rounded-btn font-bold text-white transition-all ${finalAction === 'approve' ? 'bg-government-eligibleGreen ring-4 ring-green-200' : 'bg-government-primary hover:bg-government-eligibleGreen'}`}
            >
              ✓ APPROVE — Mark as Eligible
            </button>
            <button 
               onClick={() => setFinalAction('reject')}
              className={`flex-1 py-3 px-4 rounded-btn font-bold text-white transition-all ${finalAction === 'reject' ? 'bg-government-rejectedRed ring-4 ring-red-200' : 'bg-[#D32F2F] hover:bg-government-rejectedRed'}`}
            >
              ✗ REJECT — Mark as Ineligible
            </button>
            <button 
               onClick={() => setFinalAction('clarify')}
              className={`flex-1 py-3 px-4 rounded-btn font-bold text-white transition-all ${finalAction === 'clarify' ? 'bg-[#F57C00] ring-4 ring-orange-200' : 'bg-government-reviewAmber hover:bg-[#F57C00]'}`}
            >
              ↩ Send Back for Clarification
            </button>
          </div>

          <textarea 
            className="w-full px-4 py-3 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm mb-4 bg-white" 
            rows="3" 
            placeholder="Final Remarks (required)"
            value={finalRemarks}
            onChange={(e) => setFinalRemarks(e.target.value)}
          ></textarea>

          <button 
            disabled={finalRemarks.length < 30 || !finalAction}
            className="w-full py-3 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-btn font-bold text-lg transition-colors uppercase tracking-wide"
          >
            Submit Final Decision
          </button>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default ProposalAnalysis;
