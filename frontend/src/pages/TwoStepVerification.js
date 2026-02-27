import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, CreditCard } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TwoStepVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const email = searchParams.get('email');
  const sessionToken = searchParams.get('token');

  const [step, setStep] = useState(1); // 1: Aadhaar, 2: Email
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);

  const handleAadhaarVerify = async () => {
    if (!aadhaarNumber || !aadhaarOtp) {
      toast.error('Please enter Aadhaar number and OTP');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/verify-aadhaar`,
        { aadhaar_number: aadhaarNumber, otp: aadhaarOtp },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
          withCredentials: true
        }
      );

      toast.success('Aadhaar verified successfully!');
      setAadhaarVerified(true);
      setStep(2);

      // Send email verification code
      const response = await axios.post(`${API}/auth/send-verification-email?email=${email}`);
      setVerificationCode(response.data.code); // For demo
      toast.info(`Verification code sent to ${email}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Aadhaar verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerify = async () => {
    if (!emailCode) {
      toast.error('Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/verify-email`, {
        email: email,
        code: emailCode
      });

      toast.success('Email verified! Registration complete!');
      
      // Store session token and navigate
      localStorage.setItem('session_token', sessionToken);
      navigate('/customer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-[#0056D2] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {aadhaarVerified ? <CheckCircle className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#0056D2]' : 'bg-slate-200'}`}></div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-[#0056D2] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            <span>Aadhaar Verification</span>
            <span>Email Verification</span>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          {step === 1 ? (
            <>
              <h2
                className="text-2xl font-bold text-slate-900 mb-2"
                style={{ fontFamily: 'Chivo, sans-serif' }}
                data-testid="aadhaar-verification-title"
              >
                Step 1: Aadhaar Verification
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Verify your identity with Aadhaar for government compliance
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Aadhaar Number</label>
                  <input
                    data-testid="aadhaar-input"
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
                    placeholder="Enter 12-digit Aadhaar number"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">OTP</label>
                  <input
                    data-testid="aadhaar-otp-input"
                    type="text"
                    value={aadhaarOtp}
                    onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                  <p className="mt-2 text-xs text-slate-500">For demo: Use any 12-digit number and 6-digit OTP</p>
                </div>

                <button
                  data-testid="verify-aadhaar-btn"
                  onClick={handleAadhaarVerify}
                  disabled={loading}
                  className="w-full bg-[#0056D2] text-white py-3 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify Aadhaar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2
                className="text-2xl font-bold text-slate-900 mb-2"
                style={{ fontFamily: 'Chivo, sans-serif' }}
                data-testid="email-verification-title"
              >
                Step 2: Email Verification
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Enter the verification code sent to <strong>{email}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Verification Code</label>
                  <input
                    data-testid="email-code-input"
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                  {verificationCode && (
                    <p className="mt-2 text-xs text-slate-500">
                      Demo code: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{verificationCode}</strong>
                    </p>
                  )}
                </div>

                <button
                  data-testid="verify-email-btn"
                  onClick={handleEmailVerify}
                  disabled={loading}
                  className="w-full bg-[#0056D2] text-white py-3 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Complete Registration'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoStepVerification;
