import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, RefreshCw, Plus, Building2 } from 'lucide-react';
import Modal from '../components/Modal';
const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Departments from backend
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);

  // Add department modal
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [deptError, setDeptError] = useState(null);
  const [deptSuccess, setDeptSuccess] = useState(null);
  const [deptFormLoading, setDeptFormLoading] = useState(false);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { a, b, answer: a + b };
  };

  const [captcha, setCaptcha] = useState(() => generateCaptcha());

  const refreshCaptcha = (clearError = true) => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer('');
    if (clearError) setCaptchaError(false);
  };

  // Fetch departments on load
  const fetchDepartments = async () => {
    try {
      setDeptLoading(true);
      const res = await fetch('http://localhost:5000/api/auth/departments');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setDepartments(data.data);
        if (!department) setDepartment(data.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setDeptLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setCaptchaError(false);

    if (parseInt(captchaAnswer) !== captcha.answer) {
      setCaptchaError(true);
      setCaptcha(generateCaptcha());
      setCaptchaAnswer('');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password, department })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }
      
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('officer', JSON.stringify(data.data.officer));
      onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setDeptError(null);
    setDeptSuccess(null);
    setDeptFormLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register-department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentName: newDeptName,
          name: newAdminName,
          employeeId: newAdminId,
          password: newAdminPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create department');
      }

      setDeptSuccess(`Department "${newDeptName}" created! You can now login with Employee ID: ${newAdminId}`);
      setNewDeptName('');
      setNewAdminName('');
      setNewAdminId('');
      setNewAdminPassword('');
      // Refresh departments list
      fetchDepartments();
    } catch (err) {
      setDeptError(err.message);
    } finally {
      setDeptFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[55%] bg-government-primaryDark flex-col justify-center px-16 relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <img src="/emblem.svg" alt="National Emblem" className="h-12 w-12 object-contain brightness-0 invert" />
          <span className="text-government-primaryPale text-sm tracking-widest font-semibold uppercase">Government of India</span>
        </div>

        <div className="max-w-xl">
          <h1 className="text-white text-6xl font-bold tracking-widest mb-6">TENDER.AI</h1>
          <hr className="border-government-primary mb-6 w-32 border-2" />
          <p className="text-government-primaryPale text-xl mb-12">Procurement Intelligence & Bid Evaluation System</p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-white text-lg">
              <ShieldCheck className="text-government-primaryLight" size={28} />
              <span>Automated Document Analysis</span>
            </div>
            <div className="flex items-center gap-4 text-white text-lg">
              <ShieldCheck className="text-government-primaryLight" size={28} />
              <span>Cryptographic Audit Trail</span>
            </div>
            <div className="flex items-center gap-4 text-white text-lg">
              <ShieldCheck className="text-government-primaryLight" size={28} />
              <span>Multi-Bidder Fraud Detection</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 text-government-textMuted text-xs">
          National Informatics Centre (NIC)
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[45%] bg-government-surface flex flex-col justify-center px-8 sm:px-16 relative animate-slideUp">
        <div className="absolute top-8 right-8 flex items-center gap-2 lg:hidden">
          <img src="/emblem.svg" alt="National Emblem" className="h-8 w-8 object-contain" />
          <span className="text-government-primaryDark font-bold text-lg tracking-wide">TENDER.AI</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-semibold text-government-textPrimary mb-2">Officer Sign In</h2>
          <p className="text-government-textMuted mb-8 text-sm">Access restricted to authorized procurement personnel only</p>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-btn text-sm font-medium border border-red-200">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">ID</label>
              <input 
                type="text" 
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-3 rounded-btn border border-government-border focus:outline-none focus:ring-2 focus:ring-government-primary font-mono"
                placeholder="e.g. CRPF-2024-0042"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-btn border border-government-border focus:outline-none focus:ring-2 focus:ring-government-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-3 text-government-textMuted hover:text-government-primary transition-colors"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-government-textPrimary">Department</label>
                <button
                  type="button"
                  onClick={() => { setDeptError(null); setDeptSuccess(null); setShowAddDept(true); }}
                  className="text-xs text-government-primary hover:text-government-primaryDark font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} />
                  Add New Department
                </button>
              </div>
              {deptLoading ? (
                <div className="w-full px-4 py-3 rounded-btn border border-government-border bg-gray-50 flex items-center gap-2 text-government-textMuted text-sm">
                  <RefreshCw size={14} className="animate-spin" /> Loading departments...
                </div>
              ) : (
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-btn border border-government-border focus:outline-none focus:ring-2 focus:ring-government-primary bg-white"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
            </div>

            <div className={`bg-government-surfaceHover p-4 rounded-btn border flex items-center justify-between ${captchaError ? 'border-red-400 bg-red-50' : 'border-government-border'}`}>
              <span className="text-government-textPrimary font-medium">Solve: {captcha.a} + {captcha.b} = ___</span>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => { setCaptchaAnswer(e.target.value); setCaptchaError(false); }}
                  className={`w-16 px-2 py-1 text-center rounded border focus:outline-none focus:ring-1 focus:ring-government-primary ${captchaError ? 'border-red-400 text-red-600' : 'border-government-border'}`}
                  placeholder="?"
                />
                <button type="button" onClick={refreshCaptcha} className="p-1 text-government-textMuted hover:text-government-primary">
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
            {captchaError && (
              <p className="text-red-600 text-xs mt-1">Incorrect answer. A new question has been generated.</p>
            )}

            <button 
              type="submit"
              className="w-full bg-government-primary hover:bg-government-primaryDark text-white py-3 rounded-btn font-semibold tracking-widest uppercase transition-colors"
            >
              Sign In To Portal
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-government-textMuted">
            Forgot credentials? Contact your nodal officer
          </p>
        </div>

        <div className="absolute bottom-4 left-8 right-8 text-center text-[10px] text-government-textMuted">
          Unauthorized access is punishable under IT Act 2000. All sessions are monitored and logged.
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal isOpen={showAddDept} onClose={() => setShowAddDept(false)} title="Register New Department">
        <form onSubmit={handleAddDepartment} className="space-y-4">
          {deptError && (
            <div className="p-3 bg-red-100 text-red-700 rounded-btn text-sm font-medium border border-red-200">{deptError}</div>
          )}
          {deptSuccess && (
            <div className="p-3 bg-green-100 text-green-700 rounded-btn text-sm font-medium border border-green-200">{deptSuccess}</div>
          )}

          <div className="bg-government-surfaceHover p-3 rounded-btn border border-government-border text-sm text-government-textSecondary">
            <Building2 size={14} className="inline mr-1" />
            This will create a new department and an <strong>admin account</strong> for it. The admin can then add procurement officers from the dashboard.
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              placeholder="e.g. Ministry of Education"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Admin Full Name *</label>
            <input
              type="text"
              required
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              placeholder="e.g. Rahul Verma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Admin Employee ID *</label>
            <input
              type="text"
              required
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary font-mono text-sm"
              placeholder="e.g. ADMIN-MOE-0001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-government-textPrimary mb-1">Admin Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-government-border rounded-btn focus:outline-none focus:ring-2 focus:ring-government-primary text-sm"
              placeholder="Min 6 characters"
            />
          </div>

          <div className="pt-4 border-t border-government-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddDept(false)}
              className="px-4 py-2 text-government-textPrimary hover:bg-gray-100 rounded-btn font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deptFormLoading}
              className="px-4 py-2 bg-government-primary hover:bg-government-primaryDark disabled:bg-gray-400 text-white rounded-btn font-medium transition-colors flex items-center gap-2"
            >
              {deptFormLoading && <RefreshCw size={14} className="animate-spin" />}
              Create Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Login;
