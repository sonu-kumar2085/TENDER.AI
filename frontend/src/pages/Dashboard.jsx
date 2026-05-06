import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { categories, officer } from '../data/mockData';
import { UploadCloud, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar />
      
      <main className="flex-grow w-full max-w-7xl mx-auto pb-12">
        {/* Welcome Banner */}
        <section className="bg-government-eligibleBg border-b-2 border-government-border py-8 px-6 sm:px-12 w-full mt-6 rounded-t-xl mb-12 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <h1 className="text-3xl font-bold text-government-primaryDark mb-2">Good Morning, {officer.name}</h1>
              <p className="text-government-textSecondary font-medium">{officer.department} | Last login: {officer.lastLogin}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-government-eligibleGreen text-white px-4 py-2 rounded-chip font-medium shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                12 Active Tenders
              </div>
              <div className="bg-government-reviewAmber text-white px-4 py-2 rounded-chip font-medium shadow-sm">
                3 Awaiting Review
              </div>
              <div className="bg-government-rejectedRed text-white px-4 py-2 rounded-chip font-medium shadow-sm flex items-center gap-2 relative">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                1 Fraud Alert
              </div>
            </div>
          </div>
        </section>

        {/* Tender Categories */}
        <section className="px-6 sm:px-12">
          <div className="flex justify-between items-end mb-8 border-l-4 border-government-primary pl-4">
            <div>
              <h2 className="text-2xl font-semibold text-government-primaryDark">Browse by Tender Category</h2>
              <p className="text-government-textSecondary mt-1">Click a category to view all associated tenders</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white border-2 border-government-primary text-government-primary hover:bg-government-primary hover:text-white transition-colors px-5 py-2.5 rounded-btn font-semibold shadow-sm whitespace-nowrap"
            >
              + Add New Tender
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => navigate(`/tender/TND-2025-0042`)} // Mock navigation to specific tender
                className="bg-white p-6 rounded-card shadow-card hover:shadow-cardHover border border-government-primaryPale hover:border-government-primaryLight hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
              >
                <div className="w-16 h-16 rounded-full bg-government-eligibleBg flex items-center justify-center text-3xl mb-4">
                  {cat.icon}
                </div>
                <h3 className="text-xl font-semibold text-government-primaryDark mb-2">{cat.title}</h3>
                <p className="text-government-textSecondary text-sm mb-6 flex-grow">{cat.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="bg-government-primaryPale text-government-primary font-semibold text-xs px-3 py-1 rounded-chip">
                    {cat.count} Active Tenders
                  </span>
                  <span className="text-government-accentBlue text-sm font-medium group-hover:underline">View All →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Add Tender Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Tender">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Tender Name *</label>
            <input type="text" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary" placeholder="e.g. Supply of Medical Equipment 2025" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Tender ID *</label>
              <div className="relative">
                <input type="text" readOnly value="AUTO: TND-2025-0089" className="w-full px-3 py-2 border border-government-border rounded-btn bg-gray-50 font-mono text-sm text-government-textMuted" />
                <button type="button" className="absolute right-2 top-2 text-government-primary"><RefreshCw size={16} /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Tender Type *</label>
              <select className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary bg-white text-sm">
                <option>Medical & Healthcare</option>
                <option>Technology & IT</option>
                <option>Construction</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Issuing Authority *</label>
              <input type="text" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" placeholder="e.g. CRPF Procurement Wing" />
            </div>
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Submission Deadline *</label>
              <input type="datetime-local" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Estimated Value (INR) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-government-textMuted">₹</span>
              <input type="number" className="w-full pl-8 pr-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary" placeholder="e.g. 5000000" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Description</label>
            <textarea rows="3" className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm" placeholder="Brief description of procurement requirement..."></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Upload Tender Document (PDF) *</label>
            <div className="border-2 border-dashed border-government-primaryLight rounded-btn p-6 flex flex-col items-center justify-center bg-government-surfaceHover cursor-pointer hover:bg-government-primaryPale transition-colors">
              <UploadCloud size={32} className="text-government-primary mb-2" />
              <p className="text-sm text-government-textPrimary font-medium">Drag & drop tender PDF or click to upload</p>
            </div>
          </div>

          <div className="pt-4 border-t border-government-border flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-government-textPrimary hover:bg-gray-100 rounded-btn font-medium transition-colors">Cancel</button>
            <button type="button" className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark text-white rounded-btn font-medium transition-colors">Create Tender</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
