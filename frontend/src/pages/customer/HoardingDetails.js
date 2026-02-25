import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HoardingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hoarding, setHoarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchHoarding();
  }, [id]);

  const fetchHoarding = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/hoardings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setHoarding(response.data);
    } catch (error) {
      toast.error('Failed to load hoarding details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setBookingLoading(true);

    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.post(
        `${API}/bookings`,
        {
          hoarding_id: id,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString()
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      const booking = response.data;
      toast.success('Booking created! Proceeding to payment...');

      // Create payment checkout
      const paymentResponse = await axios.post(
        `${API}/payments/checkout?booking_id=${booking.booking_id}&origin_url=${window.location.origin}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      // Redirect to Stripe
      window.location.href = paymentResponse.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
      console.error(error);
    } finally {
      setBookingLoading(false);
    }
  };

  const calculateAmount = () => {
    if (!startDate || !endDate || !hoarding) return 0;
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return days * hoarding.price_per_day;
  };

  if (loading || !hoarding) {
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
            Back to Hoardings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <img
                src={hoarding.images[0]}
                alt={hoarding.title}
                className="w-full h-96 object-cover"
              />
            </div>

            {/* Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1
                    className="text-3xl font-bold text-slate-900"
                    style={{ fontFamily: 'Chivo, sans-serif' }}
                    data-testid="hoarding-title"
                  >
                    {hoarding.title}
                  </h1>
                  <div className="flex items-center mt-2 text-slate-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {hoarding.location}
                  </div>
                </div>
                <StatusBadge status={hoarding.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-sm text-slate-600">Category</p>
                  <p className="text-lg font-semibold text-slate-900">{hoarding.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Size</p>
                  <p className="text-lg font-semibold text-slate-900">{hoarding.size}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Area</p>
                  <p className="text-lg font-semibold text-slate-900">{hoarding.area}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Visibility</p>
                  <p className="text-lg font-semibold text-slate-900">{hoarding.visibility_level}</p>
                </div>
              </div>

              {hoarding.description && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-slate-700">{hoarding.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Price per day</span>
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-[#0056D2]" />
                    <span className="text-3xl font-bold text-slate-900">{hoarding.price_per_day}</span>
                  </div>
                </div>
              </div>

              {hoarding.status === 'Available' ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Start Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          data-testid="start-date-input"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          data-testid="end-date-input"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
                        />
                      </div>
                    </div>

                    {startDate && endDate && (
                      <div className="p-4 bg-slate-50 rounded-md">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Duration</span>
                          <span className="font-semibold text-slate-900">
                            {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-lg font-bold mt-2">
                          <span className="text-slate-900">Total Amount</span>
                          <span className="text-[#0056D2]">${calculateAmount()}</span>
                        </div>
                      </div>
                    )}

                    <button
                      data-testid="book-now-btn"
                      onClick={handleBooking}
                      disabled={bookingLoading || !startDate || !endDate}
                      className="w-full bg-[#0056D2] text-white py-3 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingLoading ? 'Processing...' : 'Book Now'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">This hoarding is currently not available</p>
                  <StatusBadge status={hoarding.status} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoardingDetails;
