import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tenders, proposals } from '../data/mockData';
import { Download, CheckCircle2, XCircle, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const ProposalAnalysis = () => {
  const { tenderId, proposalId } = useParams();
  const navigate = useNavigate();

  const tender = tenders.find(t => t.id === tenderId) || tenders[0];
  const proposal = proposals.find(p => p.id === proposalId) || proposals[0];

  const [expandedTabs, setExpandedTabs] = useState({
    matched: true,
    unmatched: true,
    manual: true
  });

  const [decision, setDecision] = useState('');
  const [justification, setJustification] = useState('');
  const [finalAction, setFinalAction] = useState('');
  const [finalRemarks, setFinalRemarks] = useState('');

  const toggleTab = (tab) => {
    setExpandedTabs(prev => ({ ...prev, [tab]: !prev[tab] }));
  };

  const breadcrumbs = (
    <div className="flex items-center gap-2">
      <Link to="/dashboard" className="hover:text-government-primary transition-colors">Home</Link>
      <span>&gt;</span>
      <span>{tender.category}</span>
      <span>&gt;</span>
      <Link to={`/tender/${tender.id}`} className="hover:text-government-primary transition-colors">{tender.title}</Link>
      <span>&gt;</span>
      <span className="text-government-primaryDark font-medium">{proposal.companyName}</span>
    </div>
  );

  let badge = null;
  if (proposal.result === 'ELIGIBLE') {
    badge = <span className="bg-government-eligibleBg text-government-eligibleGreen font-bold px-3 py-1 rounded-chip border border-green-200 flex items-center gap-1"><CheckCircle2 size={16}/> ELIGIBLE</span>;
  } else if (proposal.result === 'REJECTED') {
    badge = <span className="bg-government-rejectedBg text-government-rejectedRed font-bold px-3 py-1 rounded-chip border border-red-200 flex items-center gap-1"><XCircle size={16}/> REJECTED</span>;
  } else {
    badge = <span className="bg-government-reviewBg text-government-reviewAmber font-bold px-3 py-1 rounded-chip border border-orange-200 flex items-center gap-1"><AlertTriangle size={16}/> MANUAL REVIEW</span>;
  }

  const confColor = proposal.confidence >= 0.8 ? 'bg-government-eligibleGreen' : proposal.confidence >= 0.5 ? 'bg-government-reviewAmber' : 'bg-government-rejectedRed';

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar breadcrumbs={breadcrumbs} />

      <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-6 sm:px-12 space-y-8">
        
        <div className="bg-white rounded-card shadow-card border border-government-border border-l-4 border-l-government-primary p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-government-primaryDark leading-tight">
              {proposal.companyName}
            </h1>
            {badge}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-government-textMuted mb-1">Company Reg No</p>
              <p className="font-mono text-government-monospace font-medium">{proposal.regNo}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Submission Time</p>
              <p className="font-mono text-government-textPrimary font-medium">{proposal.submissionTime}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Bid Value</p>
              <p className="font-medium text-government-textPrimary">₹ {proposal.bidValue.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Confidence Score</p>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${confColor}`} style={{ width: `${proposal.confidence * 100}%` }}></div>
                </div>
                <span className="font-mono text-sm">{proposal.confidence}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">MSME Status</p>
              <p className="font-medium">
                {proposal.msmeStatus === 'Registered' ? 
                  <span className="bg-government-primaryPale text-government-primary px-2 py-0.5 rounded text-sm">Registered</span> : 
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">Not Registered</span>
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Rank</p>
              <p className="font-medium text-government-textPrimary">#{proposal.rank} of 14 proposals</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 pt-4 border-t border-government-border">
            <button className="flex items-center gap-2 px-4 py-2 text-government-primary border border-government-primary hover:bg-government-surfaceHover rounded-btn font-medium transition-colors">
              <Download size={18} />
              Download Proposal PDF
            </button>
            <button className="px-6 py-2 bg-white text-government-primary border-2 border-government-primary hover:bg-government-primary hover:text-white rounded-btn font-medium transition-colors">
              Add to Shortlist
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => toggleTab('matched')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${expandedTabs.matched ? 'bg-government-primary text-white' : 'bg-white text-government-textPrimary border border-government-border'}`}>
            Matched ({proposal.matched.length})
            {expandedTabs.matched ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          <button onClick={() => toggleTab('unmatched')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${expandedTabs.unmatched ? 'bg-government-rejectedRed text-white' : 'bg-white text-government-textPrimary border border-government-border'}`}>
            Unmatched ({proposal.unmatched.length})
            {expandedTabs.unmatched ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
          <button onClick={() => toggleTab('manual')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${expandedTabs.manual ? 'bg-government-reviewAmber text-white' : 'bg-white text-government-textPrimary border border-government-border'}`}>
            Manual Review Needed ({proposal.manualReview.length})
            {expandedTabs.manual ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>

        <div className="space-y-6">
          {expandedTabs.matched && proposal.matched.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-government-eligibleGreen border-b border-green-200 pb-2">
                Matched Criteria — {proposal.matched.length} of 13 requirements satisfied
              </h2>
              {proposal.matched.map((item, idx) => (
                <div key={idx} className="bg-white rounded-card shadow-sm border border-government-border border-l-4 border-l-government-eligibleGreen p-4">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-semibold text-government-textPrimary">{item.name}</h3>
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
                      <div className="text-xs text-government-textMuted mt-1">Source: {item.source}</div>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Confidence:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className="bg-government-eligibleGreen h-1.5 rounded-full" style={{width: `${item.conf * 100}%`}}></div></div>
                        <span className="font-mono text-xs">{item.conf}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Clause Reference:</span>
                      <span className="font-serif text-government-primaryDark">{item.clause}</span>
                    </div>
                  </div>
                  <div className="bg-[#E3F2FD] rounded p-3 text-sm">
                    <span className="text-xs font-bold text-[#1565C0] block mb-1">AI ANALYSIS</span>
                    <p className="text-government-textPrimary">{item.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expandedTabs.unmatched && proposal.unmatched.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-government-rejectedRed border-b border-red-200 pb-2">
                Unmatched Criteria — {proposal.unmatched.length} requirements not satisfied
              </h2>
              {proposal.unmatched.map((item, idx) => (
                <div key={idx} className="bg-white rounded-card shadow-sm border border-government-border border-l-4 border-l-government-rejectedRed p-4">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-semibold text-government-textPrimary">{item.name}</h3>
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
                      <div className="text-xs text-government-textMuted mt-1">Source: {item.source}</div>
                    </div>
                    <div>
                      <span className="text-government-textMuted block">Clause Reference:</span>
                      <span className="font-serif text-government-primaryDark">{item.clause}</span>
                    </div>
                  </div>
                  <div className="bg-[#FFEBEE] rounded p-3 text-sm mb-3">
                    <span className="text-xs font-bold text-[#C62828] block mb-1">REJECTION REASON</span>
                    <p className="text-government-textPrimary">{item.reasoning}</p>
                  </div>
                  <div className="border border-government-border rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 font-medium">Document</th>
                          <th className="p-2 font-medium">Page</th>
                          <th className="p-2 font-medium">Extracted Text</th>
                          <th className="p-2 font-medium">Mismatch Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-government-border">
                        {item.evidence.map((ev, i) => (
                          <tr key={i}>
                            <td className="p-2">{ev.doc}</td>
                            <td className="p-2">{ev.page}</td>
                            <td className="p-2 font-mono text-government-rejectedRed">{ev.text}</td>
                            <td className="p-2">{ev.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expandedTabs.manual && proposal.manualReview.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-government-reviewAmber border-b border-orange-200 pb-2">
                Manual Review Required — {proposal.manualReview.length} items need officer verification
              </h2>
              {proposal.manualReview.map((item, idx) => (
                <div key={idx} className="bg-white rounded-card shadow-sm border border-government-border border-l-4 border-l-government-reviewAmber p-4">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-semibold text-government-textPrimary">{item.name}</h3>
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
                          <span className="font-medium text-government-reviewAmber">{item.extracted} (Conf: {item.conf})</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-government-textMuted block text-sm mb-1">Reason for Low Confidence:</span>
                        <div className="text-sm font-medium text-government-textPrimary bg-[#FFF3E0] p-2 rounded">{item.reason}</div>
                      </div>
                      <div>
                        <span className="text-government-textMuted block text-sm mb-1">Source:</span>
                        <span className="text-sm">{item.source}</span>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-64 bg-gray-50 border border-government-border rounded flex flex-col items-center justify-center p-4 relative group">
                      <FileText size={48} className="text-gray-300 mb-2" />
                      <span className="text-xs text-government-textMuted text-center">Preview unavailable in mock.</span>
                      <a href="#" className="text-government-accentBlue text-sm font-medium mt-2 hover:underline">View Full Page →</a>
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
