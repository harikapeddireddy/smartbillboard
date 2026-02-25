import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Download } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Bookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setBookings(response.data.bookings);
    } catch (error) {
      toast.error('Failed to load bookings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadNOC = async (bookingId) => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/noc/${bookingId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        withCredentials: true
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NOC_${bookingId}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('NOC downloaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to download NOC');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            data-testid="back-btn"
            onClick={() => navigate('/customer/dashboard')}
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1
          className="text-3xl font-bold text-slate-900 mb-6"
          style={{ fontFamily: 'Chivo, sans-serif' }}
          data-testid="bookings-title"
        >
          My Bookings
        </h1>

        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.booking_id}
              data-testid={`booking-card-${booking.booking_id}`}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Booking ID</p>
                  <p
                    className="text-base font-semibold text-slate-900 mt-1"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {booking.booking_id}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Duration</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">
                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-600">Amount</p>
                  <p className="text-base font-semibold text-[#0056D2] mt-1">${booking.amount}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>

                  {booking.noc_number && (
                    <button
                      data-testid={`download-noc-btn-${booking.booking_id}`}
                      onClick={() => downloadNOC(booking.booking_id)}
                      className="flex items-center px-3 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      NOC
                    </button>
                  )}
                </div>
              </div>

              {booking.noc_number && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    NOC Number:{' '}
                    <span
                      className="font-semibold text-slate-900"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {booking.noc_number}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}

          {bookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No bookings yet</p>
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="mt-4 px-6 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors"
              >
                Browse Hoardings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookings;
