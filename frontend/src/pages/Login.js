import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') || 'customer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, name, password, roleParam);
        toast.success('Registration successful!');
      } else {
        await login(email, password);
        toast.success('Login successful!');
      }

      // Navigate based on role
      if (roleParam === 'admin') {
        navigate('/admin/dashboard');
      } else if (roleParam === 'agent') {
        navigate('/agent/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          data-testid="back-to-home-btn"
          onClick={() => navigate('/')}
          className="mb-4 flex items-center text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-[#0056D2] bg-opacity-10 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#0056D2]" />
            </div>
          </div>

          <h2
            className="text-3xl font-bold text-center text-slate-900 mb-2"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            {isRegister ? 'Register' : 'Login'}
          </h2>
          <p className="text-center text-sm text-slate-600 mb-6">
            {roleParam === 'admin' ? 'Admin Portal' : roleParam === 'agent' ? 'Field Agent Portal' : 'Customer Portal'}
          </p>

          <form onSubmit={handleSubmit} data-testid="login-form">
            {isRegister && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    data-testid="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  data-testid="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all"
                  placeholder={roleParam === 'admin' ? 'admin@adgrid.gov' : roleParam === 'agent' ? 'agent@adgrid.gov' : 'customer@example.com'}
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  data-testid="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button
              data-testid="submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#0056D2] text-white py-2.5 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">OR</span>
              </div>
            </div>

            <button
              data-testid="google-login-btn"
              onClick={handleGoogleLogin}
              type="button"
              className="mt-4 w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-md font-medium hover:bg-slate-50 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              data-testid="toggle-register-btn"
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-[#0056D2] font-medium hover:underline"
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-slate-50 rounded-md border border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-slate-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <div>Admin: admin@adgrid.gov</div>
              <div>Customer: customer@example.com</div>
              <div>Agent: agent@adgrid.gov</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
