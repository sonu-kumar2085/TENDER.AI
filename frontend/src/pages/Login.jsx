import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, EyeOff, RefreshCw } from 'lucide-react';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('CRPF');
  const [error, setError] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setCaptchaError(false);

    if (parseInt(captchaAnswer) !== captcha.answer) {
      setCaptchaError(true);
      setCaptcha(generateCaptcha()); // generate new question but keep error visible
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

  return (
    <div className="min-h-screen flex w-full">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[55%] bg-government-primaryDark flex-col justify-center px-16 relative">
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-government-primaryPale flex items-center justify-center text-government-primaryPale text-xs font-bold">
            GOI
          </div>
          <span className="text-government-primaryPale text-sm tracking-widest font-semibold uppercase">Government of India</span>
        </div>

        <div className="max-w-xl">
          <h1 className="text-white text-6xl font-bold tracking-widest mb-6">TENDER.AI</h1>
          <hr className="border-government-primary mb-6 w-32 border-2" />
          <p className="text-government-primaryPale text-xl mb-12">Procurement Intelligence & Bid Evaluation System</p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-white text-lg">
              <ShieldCheck className="text-government-primaryLight" size={28} />
              <span>AI-Powered Document Analysis</span>
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
          Powered by Anthropic Claude
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[45%] bg-government-surface flex flex-col justify-center px-8 sm:px-16 relative">
        <div className="absolute top-8 right-8 flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-full border border-government-primaryDark flex items-center justify-center text-government-primaryDark text-[10px] font-bold">
            GOI
          </div>
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
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-btn border border-government-border focus:outline-none focus:ring-2 focus:ring-government-primary"
                  placeholder="••••••••"
                />
                <button type="button" className="absolute right-3 top-3 text-government-textMuted">
                  <EyeOff size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-government-textPrimary mb-1">Department</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-btn border border-government-border focus:outline-none focus:ring-2 focus:ring-government-primary bg-white"
              >
                <option>CRPF</option>
                <option>Ministry of Defence</option>
                <option>Ministry of Health</option>
                <option>CPWD</option>
                <option>Railways</option>
                <option>Other</option>
              </select>
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
    </div>
  );
};

export default Login;
