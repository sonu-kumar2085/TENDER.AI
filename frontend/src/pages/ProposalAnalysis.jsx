import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Download, CheckCircle2, XCircle, AlertTriangle, FileText, ChevronDown, ChevronUp, RefreshCw, RotateCcw } from 'lucide-react';
import API_BASE from '../config/api';

const ProposalAnalysis = () => {
  const { tenderId, proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [tender, setTender] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const [expandedTabs, setExpandedTabs] = useState({ matched: true, unmatched: true, manual: true });
  // Per-item state: { [itemIndex]: { decision, justification, saving, saved, error } }
  const [itemStates, setItemStates] = useState({});
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeMsg, setReanalyzeMsg] = useState(null);

  const toggleTab = (tab) => setExpandedTabs(prev => ({ ...prev, [tab]: !prev[tab] }));

  const setItemField = (idx, field, value) =>
    setItemStates(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));

  const saveReviewDecision = async (idx) => {
    const state = itemStates[idx] || {};
    setItemField(idx, 'saving', true);
    setItemField(idx, 'error', null);
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${proposalId}/review-item`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex: idx, decision: state.decision, justification: state.justification })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save');
      setItemStates(prev => ({ ...prev, [idx]: { ...prev[idx], saving: false, saved: true } }));
    } catch (err) {
      setItemStates(prev => ({ ...prev, [idx]: { ...prev[idx], saving: false, error: err.message } }));
    }
  };

  const triggerReanalyze = async () => {
    setReanalyzing(true);
    setReanalyzeMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${proposalId}/reanalyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Re-analysis failed');
      setReanalyzeMsg({ type: 'success', text: 'Re-analysis triggered! Page will refresh in 15 seconds…' });
      // Auto-refresh after 15 seconds to show new results
      setTimeout(() => window.location.reload(), 15000);
    } catch (err) {
      setReanalyzeMsg({ type: 'error', text: err.message });
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proposalRes, tenderRes, analysisRes] = await Promise.all([
          fetch(`${API_BASE}/api/proposals/${proposalId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/tenders/${tenderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/analysis/${proposalId}`, {
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

  const mlStatus = analysis?.mlAnalysisStatus || proposal?.mlExtractionStatus;
  const isProcessing = !analysis || ['pending','processing'].includes(mlStatus);
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
        {isProcessing && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-center gap-3">
            <RefreshCw className="animate-spin text-amber-500 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-800">ML Analysis In Progress</p>
              <p className="text-sm text-amber-700">The AI pipeline is still processing this proposal. Results will appear here automatically. Refresh the page in a few moments.</p>
            </div>
          </div>
        )}

        {/* Re-analyze banner / button */}
        {reanalyzeMsg && (
          <div className={`rounded-card p-4 flex items-center gap-3 border ${
            reanalyzeMsg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {reanalyzeMsg.type === 'success'
              ? <CheckCircle2 size={18} className="shrink-0" />
              : <XCircle size={18} className="shrink-0" />}
            <p className="text-sm font-medium">{reanalyzeMsg.text}</p>
          </div>
        )}
        
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

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-government-border">
            <div className="flex flex-wrap items-center gap-3">
              {proposal.proposalDocuments && proposal.proposalDocuments.length > 0 ? (
                proposal.proposalDocuments.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-government-primary border border-government-primary hover:bg-government-surfaceHover rounded-btn font-medium transition-colors text-sm"
                  >
                    <Download size={16} />
                    {doc.fileName || `Document ${idx + 1}`}
                  </a>
                ))
              ) : (
                <span className="text-sm text-government-textMuted italic">No proposal documents uploaded</span>
              )}
            </div>
            {/* Re-analyze button — refreshes ML results with human-readable names */}
            {!isProcessing && proposal.mlExtractionStatus === 'completed' && (
              <button
                onClick={triggerReanalyze}
                disabled={reanalyzing}
                title="Re-run ML analysis to refresh criterion names and scores"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-government-border hover:border-government-primary hover:text-government-primary text-government-textMuted rounded-btn font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reanalyzing
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <RotateCcw size={15} />}
                {reanalyzing ? 'Re-analyzing…' : 'Re-analyze'}
              </button>
            )}
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

          {expandedTabs.unmatched && unmatched.length > 0 && (() => {
            const missingItems  = unmatched.filter(i => i.missingFromProposal);
            const failedItems   = unmatched.filter(i => !i.missingFromProposal);
            return (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-government-rejectedRed border-b border-red-200 pb-2">
                  Unmatched Criteria — {unmatched.length} requirement{unmatched.length !== 1 ? 's' : ''} not satisfied
                  {missingItems.length > 0 && (
                    <span className="ml-3 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                      {missingItems.length} not found in proposal
                    </span>
                  )}
                </h2>

                {unmatched.map((item, idx) => {
                  const isMissing = item.missingFromProposal;
                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-card shadow-sm border border-government-border p-4 ${
                        isMissing
                          ? 'border-l-4 border-l-orange-500'
                          : 'border-l-4 border-l-government-rejectedRed'
                      }`}
                    >
                      {/* Header row */}
                      <div className="flex flex-wrap justify-between items-center mb-3 border-b border-gray-100 pb-2 gap-2">
                        <h3 className="font-semibold text-government-textPrimary">{item.criterionName}</h3>
                        <div className="flex items-center gap-2">
                          {isMissing ? (
                            <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold px-2 py-1 rounded">
                              ⚠ NOT IN PROPOSAL
                            </span>
                          ) : (
                            <span className="bg-government-rejectedBg text-government-rejectedRed text-xs font-bold px-2 py-1 rounded">
                              ✗ VALUE INSUFFICIENT
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Missing callout */}
                      {isMissing && (
                        <div className="mb-4 bg-orange-50 border border-orange-200 rounded p-3 flex items-start gap-2">
                          <span className="text-orange-500 text-lg leading-none mt-0.5">⚠</span>
                          <div>
                            <p className="text-sm font-semibold text-orange-800">
                              This requirement was not found anywhere in the submitted proposal.
                            </p>
                            {item.tenderRequirement && (
                              <p className="text-xs text-orange-700 mt-1 italic">
                                Tender clause: "{item.tenderRequirement}"
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Value grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-government-textMuted block mb-1">Tender Requires:</span>
                          <span className="font-semibold text-government-textPrimary">{item.required}</span>
                        </div>
                        <div>
                          <span className="text-government-textMuted block mb-1">
                            {isMissing ? 'Found in Proposal:' : 'Proposal Provided:'}
                          </span>
                          <span className={`font-medium ${isMissing ? 'text-orange-600' : 'text-government-rejectedRed'}`}>
                            {isMissing ? 'Not provided' : (item.found || '—')}
                          </span>
                          {!isMissing && (
                            <div className="text-xs text-government-textMuted mt-1">
                              Source: {item.sourceDocument} (pg. {item.sourcePage})
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-government-textMuted block mb-1">Clause Reference:</span>
                          <span className="font-serif text-government-primaryDark text-xs leading-snug">
                            {item.clauseReference || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Rejection reason box */}
                      <div className={`rounded p-3 text-sm ${isMissing ? 'bg-orange-50' : 'bg-[#FFEBEE]'}`}>
                        <span className={`text-xs font-bold block mb-1 ${isMissing ? 'text-orange-700' : 'text-[#C62828]'}`}>
                          {isMissing ? 'REASON FOR REJECTION' : 'REJECTION REASON'}
                        </span>
                        <p className="text-government-textPrimary">{item.rejectionReason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}


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
                    {(() => {
                      const st = itemStates[idx] || {};
                      if (item.officerDecision?.decision) {
                        return (
                          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                            <span className="font-bold text-green-700">Decision already recorded: </span>
                            <span className="capitalize">{item.officerDecision.decision}</span>
                          </div>
                        );
                      }
                      if (st.saved) {
                        return <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700 font-medium">✓ Decision saved successfully.</div>;
                      }
                      return (
                        <>
                          <h4 className="text-sm font-bold text-government-textPrimary mb-3">Your Decision</h4>
                          {st.error && <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">{st.error}</div>}
                          <div className="flex gap-6 mb-4">
                            {['accepted','rejected','clarification_requested'].map(val => (
                              <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name={`decision-${idx}`} value={val}
                                  className="h-4 w-4" checked={st.decision === val}
                                  onChange={() => setItemField(idx, 'decision', val)} />
                                {val === 'accepted' ? 'Accept' : val === 'rejected' ? 'Reject' : 'Request Clarification'}
                              </label>
                            ))}
                          </div>
                          <textarea
                            className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm mb-3"
                            rows="2" placeholder="Justification (min 20 characters)"
                            value={st.justification || ''}
                            onChange={(e) => setItemField(idx, 'justification', e.target.value)}
                          />
                          <button
                            disabled={!st.decision || (st.justification || '').length < 20 || st.saving}
                            onClick={() => saveReviewDecision(idx)}
                            className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-btn font-medium transition-colors text-sm flex items-center gap-2"
                          >
                            {st.saving && <RefreshCw size={14} className="animate-spin" />}
                            Save Decision
                          </button>
                          <p className="text-xs text-government-textMuted mt-2">⚠ This decision will be permanently recorded in the audit trail.</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


      </main>
      <Footer />
    </div>
  );
};

export default ProposalAnalysis;
