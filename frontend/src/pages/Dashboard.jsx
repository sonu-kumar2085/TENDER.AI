import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { UploadCloud, RefreshCw, FileText, X } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // Tender form state
  const [tenderName, setTenderName] = useState('');
  const [tenderType, setTenderType] = useState('Medical & Healthcare');
  const [issuingAuthority, setIssuingAuthority] = useState('');

  const [estimatedValue, setEstimatedValue] = useState('');
  const [description, setDescription] = useState('');
  const [tenderPdf, setTenderPdf] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef(null);

  const officerStr = localStorage.getItem('officer');
  const officer = officerStr ? JSON.parse(officerStr) : { name: 'Officer', department: 'Department', lastLogin: 'Unknown' };
  const token = localStorage.getItem('token');
  const userRole = (() => { try { return JSON.parse(atob(token.split('.')[1])).role; } catch { return null; } })();

  const fetchTenders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tenders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTenders(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch tenders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const baseCategories = [
    { id: "cat-1", icon: "🏥", title: "Medical & Healthcare", desc: "Medicines, equipment, PPE, hospital infrastructure" },
    { id: "cat-2", icon: "🍽️", title: "Food & Catering", desc: "Ration supply, canteen services, packaged food" },
    { id: "cat-3", icon: "🏗️", title: "Construction & Infrastructure", desc: "Civil works, roads, buildings, maintenance" },
    { id: "cat-4", icon: "💻", title: "Technology & IT", desc: "Hardware, software, networking, cybersecurity" },
    { id: "cat-5", icon: "📋", title: "Technical & Engineering", desc: "Machinery, vehicles, specialized equipment" },
    { id: "cat-6", icon: "💰", title: "Finance & Consulting", desc: "Audit services, legal, financial advisory" }
  ];

  const categoriesWithTenders = baseCategories.map(cat => {
    const catTenders = tenders.filter(t => t.type === cat.title);
    return { ...cat, count: catTenders.length, assignedTenders: catTenders };
  });

  const resetForm = () => {
    setTenderName('');
    setTenderType('Medical & Healthcare');
    setIssuingAuthority('');

    setEstimatedValue('');
    setDescription('');
    setTenderPdf(null);
    setFormError(null);
    setFormLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!tenderPdf) {
      setFormError('Please upload a tender PDF document');
      return;
    }

    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', tenderName);
      formData.append('type', tenderType);
      formData.append('issuingAuthority', issuingAuthority);

      formData.append('estimatedValue', estimatedValue);
      formData.append('description', description);
      formData.append('tenderPdf', tenderPdf);

      const res = await fetch('http://localhost:5000/api/tenders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create tender');
      }

      resetForm();
      setIsModalOpen(false);
      setLoading(true);
      fetchTenders();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTender = async (e, t) => {
    e.stopPropagation();
    const name = t.name.replace(/\[OPEN\]\s*/i, '');
    if (!window.confirm(`Delete "${name}"?\n\nThis will also delete ALL proposals and analyses linked to this tender. This cannot be undone.`)) return;
    setDeleteLoadingId(t._id);
    try {
      const res = await fetch(`http://localhost:5000/api/tenders/${t.tenderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Delete failed');
      setTenders(prev => prev.filter(x => x._id !== t._id));
    } catch (err) {
      alert(`Failed to delete tender: ${err.message}`);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setFormError('Only PDF files are allowed');
        return;
      }
      setTenderPdf(file);
      setFormError(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar />
      
      <main className="flex-grow w-full max-w-7xl mx-auto pb-12">
        {/* Welcome Banner */}
        <section className="bg-government-eligibleBg border-b-2 border-government-border py-8 px-6 sm:px-12 w-full mt-6 rounded-t-xl mb-12 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <h1 className="text-3xl font-bold text-government-primaryDark mb-2">Hello, {officer.name}</h1>
              <p className="text-government-textSecondary font-medium">{officer.department}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-government-eligibleGreen text-white px-4 py-2 rounded-chip font-medium shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {tenders.length} Active Tenders
              </div>
            </div>
          </div>
        </section>

        {/* Tender Categories */}
        <section className="px-6 sm:px-12">
          <div className="flex justify-between items-end mb-8 border-l-4 border-government-primary pl-4">
            <div>
              <h2 className="text-2xl font-semibold text-government-primaryDark">Browse by Tender Category</h2>
              <p className="text-government-textSecondary mt-1">Select a tender from the category list below</p>
            </div>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-white border-2 border-government-primary text-government-primary hover:bg-government-primary hover:text-white transition-colors px-5 py-2.5 rounded-btn font-semibold shadow-sm whitespace-nowrap"
            >
              + Add New Tender
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="animate-spin text-government-primary" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoriesWithTenders.map((cat) => (
                <div 
                  key={cat.id} 
                  className="bg-white p-6 rounded-card shadow-card border border-government-primaryPale transition-all duration-300 flex flex-col h-96 hover:-translate-y-1.5 hover:shadow-cardHover cursor-default"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-government-eligibleBg flex items-center justify-center text-2xl">
                      {cat.icon}
                    </div>
                    <span className="bg-government-primaryPale text-government-primary font-semibold text-xs px-3 py-1 rounded-chip">
                      {cat.count} Active
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-government-primaryDark mb-1">{cat.title}</h3>
                  <p className="text-government-textSecondary text-xs mb-4">{cat.desc}</p>
                  
                  <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                    {cat.assignedTenders.length > 0 ? (
                      <ul className="space-y-3 mt-2">
                        {cat.assignedTenders.map((t, idx) => (
                          <li 
                            key={t._id} 
                            onClick={() => navigate(`/tender/${t.tenderId}`)}
                            className="bg-gray-50 hover:bg-government-surfaceHover p-3 rounded border border-gray-200 cursor-pointer transition-colors animate-slideUp group"
                            style={{ animationDelay: `${idx * 60}ms` }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-grow min-w-0">
                                <div className="text-sm font-semibold text-government-textPrimary line-clamp-2">
                                  {t.name.replace(/\[OPEN\]\s*/i, '')}
                                </div>
                                <div className="text-xs text-government-textMuted mt-1">
                                  ID: {t.tenderId}
                                </div>
                              </div>
                              {userRole === 'admin' && (
                                <button
                                  onClick={(e) => handleDeleteTender(e, t)}
                                  disabled={deleteLoadingId === t._id}
                                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all disabled:opacity-50"
                                  title="Delete Tender"
                                >
                                  {deleteLoadingId === t._id
                                    ? <RefreshCw size={13} className="animate-spin" />
                                    : '🗑'}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-400 italic text-center py-8">No assigned tenders</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Add Tender Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Tender">
        <form onSubmit={handleCreateTender} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-100 text-red-700 rounded-btn text-sm font-medium border border-red-200">{formError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Tender Name *</label>
            <input
              type="text"
              required
              value={tenderName}
              onChange={(e) => setTenderName(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary"
              placeholder="e.g. Supply of Medical Equipment 2025"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Tender ID</label>
              <div className="relative">
                <input type="text" readOnly value="AUTO-GENERATED" className="w-full px-3 py-2 border border-government-border rounded-btn bg-gray-50 font-mono text-sm text-government-textMuted" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Tender Type *</label>
              <select
                value={tenderType}
                onChange={(e) => setTenderType(e.target.value)}
                className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary bg-white text-sm"
              >
                {baseCategories.map((cat) => (
                  <option key={cat.id} value={cat.title}>{cat.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Issuing Authority *</label>
              <input
                type="text"
                required
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
                placeholder="e.g. CRPF Procurement Wing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Estimated Value (INR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-government-textMuted">₹</span>
                <input
                  type="number"
                  required
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
                  placeholder="e.g. 5000000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              placeholder="Brief description of procurement requirement..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Upload Tender Document (PDF) *</label>
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {!tenderPdf ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-government-primaryLight rounded-btn p-6 flex flex-col items-center justify-center bg-government-surfaceHover cursor-pointer hover:bg-government-primaryPale transition-colors"
              >
                <UploadCloud size={32} className="text-government-primary mb-2" />
                <p className="text-sm text-government-textPrimary font-medium">Click to upload tender PDF</p>
                <p className="text-xs text-government-textMuted mt-1">Max 10MB • PDF only</p>
              </div>
            ) : (
              <div className="border border-government-border rounded-btn p-3 flex items-center justify-between bg-government-eligibleBg">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-government-primary" />
                  <span className="text-sm font-medium text-government-textPrimary truncate max-w-[300px]">{tenderPdf.name}</span>
                  <span className="text-xs text-government-textMuted">({(tenderPdf.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setTenderPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-government-rejectedRed hover:bg-government-rejectedBg p-1 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-government-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-government-textPrimary hover:bg-gray-100 rounded-btn font-medium transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-btn font-medium transition-colors flex items-center gap-2"
            >
              {formLoading && <RefreshCw size={14} className="animate-spin" />}
              Create Tender
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
