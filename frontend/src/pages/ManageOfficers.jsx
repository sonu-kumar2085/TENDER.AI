import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import { RefreshCw, UserPlus, Trash2, Shield, Users } from 'lucide-react';

const ManageOfficers = () => {
  const navigate = useNavigate();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const token = localStorage.getItem('token');
  const officerStr = localStorage.getItem('officer');
  const currentOfficer = officerStr ? JSON.parse(officerStr) : {};

  const fetchOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/officers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOfficers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch officers:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Redirect non-admins or fetch officers
  useEffect(() => {
    if (currentOfficer.role !== 'admin') {
      navigate('/dashboard');
    } else {
      fetchOfficers();
    }
  }, [currentOfficer.role, navigate, fetchOfficers]);

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/officers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          employeeId: newEmployeeId,
          password: newPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to add officer');
      }

      // Reset form and close modal
      setNewName('');
      setNewEmployeeId('');
      setNewPassword('');
      setIsModalOpen(false);
      fetchOfficers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteOfficer = async (employeeId, name) => {
    if (!window.confirm(`Are you sure you want to delete officer "${name}" (${employeeId})? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(employeeId);
    try {
      const res = await fetch(`http://localhost:5000/api/officers/${employeeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to delete officer');
      }

      fetchOfficers();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const openAddModal = () => {
    setFormError(null);
    setNewName('');
    setNewEmployeeId('');
    setNewPassword('');
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-government-bg">
      <Navbar />

      <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-6 sm:px-12 animate-fadeIn">
        {/* Header */}
        <section className="bg-government-eligibleBg border-b-2 border-government-border py-8 px-6 sm:px-12 w-full rounded-t-xl mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-government-primary flex items-center justify-center">
                <Users size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-government-primaryDark mb-1">Manage Officers</h1>
                <p className="text-government-textSecondary font-medium">
                  <Shield size={14} className="inline mr-1" />
                  {currentOfficer.department} — Procurement Officers
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-government-primary text-white px-4 py-2 rounded-chip font-medium shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {officers.length} Officers
              </div>
              <button
                onClick={openAddModal}
                className="bg-white border-2 border-government-primary text-government-primary hover:bg-government-primary hover:text-white transition-colors px-5 py-2 rounded-btn font-semibold shadow-sm flex items-center gap-2"
              >
                <UserPlus size={18} />
                Add Officer
              </button>
            </div>
          </div>
        </section>

        {/* Officers Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="animate-spin text-government-primary" size={32} />
          </div>
        ) : (
          <div className="bg-white rounded-card shadow-card overflow-x-auto border border-government-border">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-government-primary text-white">
                  <th className="p-4 font-semibold w-12">#</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Employee ID</th>
                  <th className="p-4 font-semibold">Department</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Last Login</th>
                  <th className="p-4 font-semibold w-32 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-government-border">
                {officers.map((off, idx) => (
                  <tr key={off._id || off.employeeId} className="hover:bg-gray-50 transition-colors animate-slideUp" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="p-4 text-government-textMuted font-medium">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-government-primaryPale text-government-primary flex items-center justify-center font-bold text-sm">
                          {off.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-government-textPrimary">{off.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-government-monospace">{off.employeeId}</td>
                    <td className="p-4 text-government-textSecondary">{off.department}</td>
                    <td className="p-4">
                      {off.isActive !== false ? (
                        <span className="bg-government-eligibleBg text-government-eligibleGreen text-xs font-bold px-2.5 py-1 rounded-chip border border-green-200">Active</span>
                      ) : (
                        <span className="bg-government-rejectedBg text-government-rejectedRed text-xs font-bold px-2.5 py-1 rounded-chip border border-red-200">Inactive</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-government-textMuted">
                      {off.lastLogin ? new Date(off.lastLogin).toLocaleString('en-IN') : 'Never'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteOfficer(off.employeeId, off.name)}
                        disabled={deleteLoading === off.employeeId}
                        className="text-government-rejectedRed hover:bg-government-rejectedBg px-3 py-1.5 rounded-btn font-medium text-sm transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {deleteLoading === off.employeeId ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {officers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-government-textMuted italic">
                      No procurement officers found in your department. Click "Add Officer" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer />

      {/* Add Officer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Procurement Officer">
        <form onSubmit={handleAddOfficer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-100 text-red-700 rounded-btn text-sm font-medium border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              placeholder="e.g. Rajesh Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Employee ID *</label>
            <input
              type="text"
              required
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary font-mono text-sm"
              placeholder="e.g. CRPF-2024-0099"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              placeholder="Min 6 characters"
            />
          </div>

          <div className="bg-government-surfaceHover p-3 rounded-btn border border-government-border text-sm text-government-textSecondary">
            <Shield size={14} className="inline mr-1" />
            Officer will be created in your department: <strong>{currentOfficer.department}</strong>
          </div>

          <div className="pt-4 border-t border-government-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-government-textPrimary hover:bg-gray-100 rounded-btn font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-400 text-white rounded-btn font-medium transition-colors flex items-center gap-2"
            >
              {formLoading && <RefreshCw size={14} className="animate-spin" />}
              Add Officer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageOfficers;
