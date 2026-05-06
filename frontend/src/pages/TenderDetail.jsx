import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { Download, Trophy, AlertTriangle, CheckCircle2, XCircle, UploadCloud, RefreshCw, FileText, X } from 'lucide-react';

const TenderDetail = () => {
  const { tenderId } = useParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tender, setTender] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Proposal form state
  const [companyName, setCompanyName] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [bidValue, setBidValue] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isMsme, setIsMsme] = useState(false);
  const [proposalFiles, setProposalFiles] = useState([]);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [tenderRes, proposalsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/tenders/${tenderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/tenders/${tenderId}/proposals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const tenderData = await tenderRes.json();
      const proposalsData = await proposalsRes.json();

      if (tenderData.success) setTender(tenderData.data);
      if (proposalsData.success) setProposals(proposalsData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenderId]);

  const resetForm = () => {
    setCompanyName('');
    setCompanyRegNo('');
    setBidValue('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setIsMsme(false);
    setProposalFiles([]);
    setFormError(null);
    setFormLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const invalidFiles = files.filter(f => f.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setFormError('Only PDF files are allowed');
      return;
    }
    setProposalFiles(prev => [...prev, ...files]);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setProposalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (proposalFiles.length === 0) {
      setFormError('Please upload at least one proposal document (PDF)');
      return;
    }

    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append('companyName', companyName);
      formData.append('companyRegistrationNo', companyRegNo);
      formData.append('bidValue', bidValue);
      formData.append('contactPersonName', contactName);
      formData.append('contactEmail', contactEmail);
      formData.append('contactPhone', contactPhone);
      formData.append('isMsmeRegistered', isMsme);

      for (const file of proposalFiles) {
        formData.append('proposalDocuments', file);
      }

      const res = await fetch(`http://localhost:5000/api/tenders/${tenderId}/proposals`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit proposal');
      }

      resetForm();
      setIsModalOpen(false);
      setLoading(true);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

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

  if (!tender) {
    return (
      <div className="min-h-screen flex flex-col bg-government-bg">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-government-textMuted text-lg">Tender not found.</p>
            <Link to="/dashboard" className="text-government-primary mt-4 inline-block hover:underline">← Back to Dashboard</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const breadcrumbs = (
    <div className="flex items-center gap-2">
      <Link to="/dashboard" className="hover:text-government-primary transition-colors font-medium">Home</Link>
      <span>&gt;</span>
      <Link to="/dashboard" className="hover:text-government-primary transition-colors">{tender.type}</Link>
      <span>&gt;</span>
      <span className="text-government-primaryDark font-medium">{tender.name}</span>
    </div>
  );

  const sortedProposals = [...proposals].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar breadcrumbs={breadcrumbs} />

      <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-6 sm:px-12">
        <div className="bg-white rounded-card shadow-card border border-government-border border-l-4 border-l-government-primary p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-government-primaryDark leading-tight">
              {tender.name}
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-government-textMuted mb-1">Tender ID</p>
              <p className="font-mono text-government-monospace font-medium">{tender.tenderId}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Issuing Authority</p>
              <p className="font-medium text-government-textPrimary">{tender.issuingAuthority}</p>
            </div>
            <div>
              <p className="text-sm text-government-textMuted mb-1">Estimated Value</p>
              <p className="font-medium text-government-textPrimary">₹ {tender.estimatedValue?.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-government-textSecondary">{tender.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 pt-4 border-t border-government-border">
            {tender.tenderPdfUrl && (
              <a
                href={tender.tenderPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-government-primary border border-government-primary hover:bg-government-surfaceHover rounded-btn font-medium transition-colors"
              >
                <Download size={18} />
                Download Tender PDF
              </a>
            )}
            {!tender.tenderPdfUrl && (
              <button className="flex items-center gap-2 px-4 py-2 text-government-textMuted border border-government-border rounded-btn font-medium cursor-not-allowed" disabled>
                <Download size={18} />
                No PDF Available
              </button>
            )}
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
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
              {proposals.length} Proposals
            </span>
          </div>

          <div className="bg-government-surfaceHover border border-government-border rounded-t-card p-3 mb-4 text-sm text-government-textSecondary flex items-center gap-2">
            <AlertTriangle size={18} className="text-government-reviewAmber" />
            Proposals have been ranked by eligibility score. Manual review required for highlighted entries.
          </div>

          <div className="bg-white rounded-card shadow-card overflow-x-auto border border-government-border mb-6">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-government-primary text-white">
                  <th className="p-4 font-semibold w-20">Rank</th>
                  <th className="p-4 font-semibold">Company Name</th>
                  <th className="p-4 font-semibold">Bid Value</th>
                  <th className="p-4 font-semibold w-48">Confidence Score</th>
                  <th className="p-4 font-semibold w-48">Evaluation Result</th>
                  <th className="p-4 font-semibold w-40 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-government-border">
                {sortedProposals.map((prop) => {
                  const analysis = prop.analysisResult;
                  const result = analysis?.overallResult || 'manual_review';
                  const confidence = analysis?.confidenceScore ?? 0;
                  const hasFraud = analysis?.fraudFlags?.length > 0;

                  let rowStyle = "hover:bg-gray-50 transition-colors bg-white";
                  let aiBadge = null;

                  if (result === 'eligible') {
                    aiBadge = (
                      <span className="inline-flex items-center gap-1.5 bg-government-eligibleBg text-government-eligibleGreen px-2.5 py-1 rounded-chip text-xs font-bold border border-green-200">
                        <CheckCircle2 size={14} /> ELIGIBLE
                      </span>
                    );
                  } else if (result === 'rejected') {
                    rowStyle = "hover:bg-government-rejectedBg transition-colors bg-white";
                    aiBadge = (
                      <span className="inline-flex items-center gap-1.5 bg-government-rejectedBg text-government-rejectedRed px-2.5 py-1 rounded-chip text-xs font-bold border border-red-200">
                        <XCircle size={14} /> REJECTED
                      </span>
                    );
                  } else {
                    rowStyle = "hover:bg-[#FFFBF0] transition-colors bg-white border-l-4 border-l-government-reviewAmber";
                    aiBadge = (
                      <span className="inline-flex items-center gap-1.5 bg-government-reviewBg text-government-reviewAmber px-2.5 py-1 rounded-chip text-xs font-bold border border-orange-200">
                        <AlertTriangle size={14} /> MANUAL REVIEW
                      </span>
                    );
                  }

                  if (hasFraud) {
                    rowStyle += " !border-l-4 !border-l-government-rejectedRed";
                  }

                  const confColor = confidence >= 0.8 ? 'bg-government-eligibleGreen' : confidence >= 0.5 ? 'bg-government-reviewAmber' : 'bg-government-rejectedRed';

                  return (
                    <tr key={prop._id} className={rowStyle}>
                      <td className="p-4 text-center">
                        {prop.rank === 1 ? <Trophy className="text-yellow-500 mx-auto" size={24} /> :
                         prop.rank === 2 ? <Trophy className="text-gray-400 mx-auto" size={24} /> :
                         prop.rank === 3 ? <Trophy className="text-amber-600 mx-auto" size={24} /> :
                         <span className="text-government-textMuted font-bold text-lg">#{prop.rank ?? '—'}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-government-textPrimary">{prop.companyName}</span>
                          {hasFraud && (
                            <span className="bg-government-rejectedRed text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">⚠ Fraud Risk</span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-government-textMuted mt-1">{prop.companyRegistrationNo}</div>
                      </td>
                      <td className="p-4 font-medium">₹ {prop.bidValue?.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${confColor}`} style={{ width: `${confidence * 100}%` }}></div>
                          </div>
                          <span className="text-sm font-mono text-government-textPrimary w-10 text-right">
                            {Math.round(confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">{aiBadge}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => navigate(`/tender/${tenderId}/proposal/${prop.proposalId}`)}
                          className="text-government-primary hover:text-government-primaryDark hover:bg-government-primaryPale px-3 py-1.5 rounded-btn font-medium text-sm transition-colors"
                        >
                          Detail Analysis →
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sortedProposals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-government-textMuted italic">No proposals submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {/* Submit Proposal Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit Proposal">
        <form onSubmit={handleSubmitProposal} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-100 text-red-700 rounded-btn text-sm font-medium border border-red-200">{formError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Company Registration No. *</label>
              <input
                type="text"
                required
                value={companyRegNo}
                onChange={(e) => setCompanyRegNo(e.target.value)}
                className="w-full px-3 py-2 border border-government-border rounded-btn font-mono focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Bid Value (INR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-government-textMuted text-sm">₹</span>
                <input
                  type="number"
                  required
                  value={bidValue}
                  onChange={(e) => setBidValue(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-government-textPrimary mb-1">Contact Person Name *</label>
               <input
                 type="text"
                 required
                 value={contactName}
                 onChange={(e) => setContactName(e.target.value)}
                 className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-government-textPrimary mb-1">Contact Email *</label>
               <input
                 type="email"
                 required
                 value={contactEmail}
                 onChange={(e) => setContactEmail(e.target.value)}
                 className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
             <div>
               <label className="block text-sm font-medium text-government-textPrimary mb-1">Contact Phone *</label>
               <input
                 type="tel"
                 required
                 value={contactPhone}
                 onChange={(e) => setContactPhone(e.target.value)}
                 className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
               />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <span className="text-sm font-medium text-government-textPrimary">MSME Registered?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMsme}
                  onChange={(e) => setIsMsme(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-government-primaryPale rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-government-primary"></div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Upload Proposal Documents (PDF) *</label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              ref={fileInputRef}
              onChange={handleFilesChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-government-primaryLight rounded-btn p-6 flex flex-col items-center justify-center bg-government-surfaceHover cursor-pointer hover:bg-government-primaryPale transition-colors"
            >
              <UploadCloud size={32} className="text-government-primary mb-2" />
              <p className="text-sm text-center text-government-textPrimary font-medium">Click to upload proposal PDFs</p>
              <p className="text-xs text-government-textMuted mt-1">Bid document, ISO cert, GST, turnover proof, EMD • Max 10MB each</p>
            </div>

            {proposalFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {proposalFiles.map((file, idx) => (
                  <div key={idx} className="border border-government-border rounded-btn p-2 flex items-center justify-between bg-government-eligibleBg">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-government-primary" />
                      <span className="text-sm font-medium text-government-textPrimary truncate max-w-[250px]">{file.name}</span>
                      <span className="text-xs text-government-textMuted">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-government-rejectedRed hover:bg-government-rejectedBg p-1 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-government-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-government-textPrimary hover:bg-gray-100 rounded-btn font-medium transition-colors text-sm">Cancel</button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-btn font-medium transition-colors text-sm flex items-center gap-2"
            >
              {formLoading && <RefreshCw size={14} className="animate-spin" />}
              Submit Proposal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenderDetail;
