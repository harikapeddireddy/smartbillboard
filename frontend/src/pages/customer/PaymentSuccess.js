import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 5;

    if (attempts >= maxAttempts) {
      setLoading(false);
      toast.error('Payment verification timed out');
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === 'paid') {
        setPaymentStatus(data);
        setLoading(false);
        toast.success('Payment successful!');
        return;
      } else if (data.status === 'expired') {
        setLoading(false);
        toast.error('Payment session expired');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    } catch (error) {
      console.error('Payment status check error:', error);
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2] mx-auto"></div>
          <p className="mt-4 text-slate-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-[#22C55E]" />
          </div>

          <h1
            className="text-2xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Chivo, sans-serif' }}
            data-testid="success-title"
          >
            Payment Successful!
          </h1>

          <p className="text-slate-600 mb-6">
            Your booking has been confirmed and NOC certificate has been generated.
          </p>

          {paymentStatus && (
            <div className="bg-slate-50 rounded-md p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount Paid:</span>
                  <span className="font-semibold text-slate-900">
                    ${(paymentStatus.amount_total / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-semibold text-[#22C55E]">Paid</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              data-testid="view-bookings-btn"
              onClick={() => navigate('/customer/bookings')}
              className="w-full bg-[#0056D2] text-white py-3 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors"
            >
              View My Bookings
            </button>

            <button
              onClick={() => navigate('/customer/dashboard')}
              className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-md font-medium hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
