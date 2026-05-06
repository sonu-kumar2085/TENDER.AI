import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { tenders, proposals } from '../data/mockData';
import { Download, Trophy, AlertTriangle, CheckCircle2, XCircle, UploadCloud } from 'lucide-react';

const TenderDetail = () => {
  const { tenderId } = useParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tender = tenders.find(t => t.id === tenderId) || tenders[0];
  const tenderProposals = proposals.filter(p => p.tenderId === tender.id);

  const breadcrumbs = (
    <div className="flex items-center gap-2">
      <Link to="/dashboard" className="hover:text-government-primary transition-colors">Home</Link>
      <span>&gt;</span>
      <span>{tender.category}</span>
      <span>&gt;</span>
      <span className="text-government-primaryDark font-medium">{tender.title}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar breadcrumbs={breadcrumbs} />

      <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-6 sm:px-12">
        <div className="bg-white rounded-card shadow-card border border-government-border border-l-4 border-l-government-primary p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-government-primaryDark leading-tight">
              {tender.title}
            </h1>
            <span className="bg-government-eligibleBg text-government-eligibleGreen font-bold px-3 py-1 rounded-chip text-sm border border-government-border whitespace-nowrap self-start">
              [{tender.status}]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-sm text-government-textMuted mb-1">Tender ID</p>
              <p className="font-mono text-government-monospace font-medium">{tender.id}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Issuing Authority</p>
              <p className="font-medium text-government-textPrimary">{tender.authority}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Deadline</p>
              <p className="font-medium text-government-rejectedRed">{tender.deadline}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Estimated Value</p>
              <p className="font-medium text-government-textPrimary">₹ {tender.value.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-government-textSecondary">{tender.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 pt-4 border-t border-government-border">
            <button className="flex items-center gap-2 px-4 py-2 text-government-primary border border-government-primary hover:bg-government-surfaceHover rounded-btn font-medium transition-colors">
              <Download size={18} />
              Download Tender PDF
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-government-primary hover:bg-government-primaryDark text-white rounded-btn font-medium transition-colors"
            >
              + Add Proposal
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4 border-l-4 border-government-primary pl-4">
            <h2 className="text-2xl font-semibold text-government-primaryDark">Submitted Proposals</h2>
            <span className="bg-government-primaryPale text-government-primaryDark px-3 py-1 rounded-chip text-sm font-bold">
              {tenderProposals.length} Proposals
            </span>
          </div>

          <div className="bg-government-surfaceHover border border-government-border rounded-t-card p-3 mb-4 text-sm text-government-textSecondary flex items-center gap-2">
            <AlertTriangle size={18} className="text-government-reviewAmber" />
            AI has ranked all proposals by eligibility score. Manual review required for highlighted entries.
          </div>

          <div className="bg-white rounded-card shadow-card overflow-x-auto border border-government-border mb-6">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-government-primary text-white">
                  <th className="p-4 font-semibold w-20">Rank</th>
                  <th className="p-4 font-semibold">Company Name</th>
                  <th className="p-4 font-semibold">Bid Value</th>
                  <th className="p-4 font-semibold w-48">Confidence Score</th>
                  <th className="p-4 font-semibold w-48">AI Result</th>
                  <th className="p-4 font-semibold w-40 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-government-border">
                {tenderProposals.sort((a,b) => a.rank - b.rank).map((prop) => {
                  
                  let rowStyle = "hover:bg-gray-50 transition-colors bg-white";
                  let aiBadge = null;
                  
                  if (prop.result === 'ELIGIBLE') {
                    aiBadge = (
                      <span className="inline-flex items-center gap-1.5 bg-government-eligibleBg text-government-eligibleGreen px-2.5 py-1 rounded-chip text-xs font-bold border border-green-200">
                        <CheckCircle2 size={14} /> ELIGIBLE
                      </span>
                    );
                  } else if (prop.result === 'REJECTED') {
                    rowStyle = "hover:bg-government-rejectedBg transition-colors bg-white";
                    aiBadge = (
                      <span className="inline-flex items-center gap-1.5 bg-government-rejectedBg text-government-rejectedRed px-2.5 py-1 rounded-chip text-xs font-bold border border-red-200 cursor-help" title="Fails minimum criteria">
                        <XCircle size={14} /> REJECTED
                      </span>
                    );
                  } else if (prop.result === 'MANUAL REVIEW') {
                    rowStyle = "hover:bg-[#FFFBF0] transition-colors bg-white border-l-4 border-l-government-reviewAmber";
                    aiBadge = (
                      <span className="inline-flex items-center gap-1.5 bg-government-reviewBg text-government-reviewAmber px-2.5 py-1 rounded-chip text-xs font-bold border border-orange-200 cursor-help" title="Low OCR confidence on some pages">
                        <AlertTriangle size={14} /> MANUAL REVIEW
                      </span>
                    );
                  }

                  if (prop.fraudRisk) {
                    rowStyle += " !border-l-4 !border-l-government-rejectedRed";
                  }

                  const confColor = prop.confidence >= 0.8 ? 'bg-government-eligibleGreen' : prop.confidence >= 0.5 ? 'bg-government-reviewAmber' : 'bg-government-rejectedRed';

                  return (
                    <tr key={prop.id} className={rowStyle}>
                      <td className="p-4 text-center">
                        {prop.rank === 1 ? <Trophy className="text-yellow-500 mx-auto" size={24} /> :
                         prop.rank === 2 ? <Trophy className="text-gray-400 mx-auto" size={24} /> :
                         prop.rank === 3 ? <Trophy className="text-amber-600 mx-auto" size={24} /> :
                         <span className="text-government-textMuted font-bold text-lg">#{prop.rank}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-government-textPrimary">{prop.companyName}</span>
                          {prop.fraudRisk && (
                            <span className="bg-government-rejectedRed text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">⚠ Fraud Risk</span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-government-textMuted mt-1">{prop.regNo}</div>
                      </td>
                      <td className="p-4 font-medium">₹ {prop.bidValue.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${confColor}`} style={{ width: `${prop.confidence * 100}%` }}></div>
                          </div>
                          <span className="text-sm font-mono text-government-textPrimary w-10 text-right">
                            {Math.round(prop.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">{aiBadge}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => navigate(`/tender/${tender.id}/proposal/${prop.id}`)}
                          className="text-government-primary hover:text-government-primaryDark hover:bg-government-primaryPale px-3 py-1.5 rounded-btn font-medium text-sm transition-colors"
                        >
                          Detail Analysis →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-center mt-4">
             <div className="flex items-center gap-2">
               <button className="px-3 py-1 rounded border border-government-border text-government-textMuted hover:bg-government-surfaceHover">Prev</button>
               <button className="px-3 py-1 rounded bg-government-primary text-white">1</button>
               <button className="px-3 py-1 rounded border border-government-border text-government-textMuted hover:bg-government-surfaceHover">2</button>
               <button className="px-3 py-1 rounded border border-government-border text-government-textMuted hover:bg-government-surfaceHover">Next</button>
             </div>
          </div>
        </div>
      </main>

      <Footer />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Proposal">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Company Name *</label>
            <input type="text" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Company Registration No. *</label>
              <input type="text" className="w-full px-3 py-2 border border-government-border rounded-btn font-mono focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Bid Value (INR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-government-textMuted text-sm">₹</span>
                <input type="number" className="w-full pl-7 pr-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-government-textPrimary mb-1">Contact Person Name *</label>
               <input type="text" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
            </div>
            <div>
               <label className="block text-sm font-medium text-government-textPrimary mb-1">Contact Email *</label>
               <input type="email" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
             <div>
               <label className="block text-sm font-medium text-government-textPrimary mb-1">Contact Phone *</label>
               <input type="tel" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <span className="text-sm font-medium text-government-textPrimary">MSME Registered?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-government-primaryPale rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-government-primary"></div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Upload Proposal Documents (PDF) *</label>
            <div className="border-2 border-dashed border-government-primaryLight rounded-btn p-6 flex flex-col items-center justify-center bg-government-surfaceHover cursor-pointer hover:bg-government-primaryPale transition-colors">
              <UploadCloud size={32} className="text-government-primary mb-2" />
              <p className="text-sm text-center text-government-textPrimary font-medium">Upload all proposal PDFs (bid document, ISO cert, GST, turnover proof, EMD)</p>
            </div>
          </div>

          <div className="pt-4 border-t border-government-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-government-textPrimary hover:bg-gray-100 rounded-btn font-medium transition-colors text-sm">Cancel</button>
            <button type="button" className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark text-white rounded-btn font-medium transition-colors text-sm">Submit Proposal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenderDetail;
