import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AgentRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    area: '',
    city: 'Kakinada',
    district: 'Kakinada',
    country: 'India',
    coordinates: { lat: 16.9891, lng: 82.2475 },
    size: '',
    category: 'Economy',
    price_per_day: 700,
    visibility_level: 'Medium',
    description: '',
    type: 'Basic'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/agent/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setRequests(response.data.requests);
    } catch (error) {
      toast.error('Failed to load requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!formData.title || !formData.location || !formData.size) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('session_token');
      await axios.post(
        `${API}/agent/hoarding-request`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      toast.success('Hoarding request submitted successfully!');
      setShowForm(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/agent/dashboard')}
              className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            <button
              data-testid="new-request-btn"
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1
          className="text-3xl font-bold text-slate-900 mb-6"
          style={{ fontFamily: 'Chivo, sans-serif' }}
        >
          My Hoarding Requests
        </h1>

        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.request_id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    {request.hoarding_data.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{request.hoarding_data.location}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Category:</span>
                  <p className="font-semibold text-slate-900">{request.hoarding_data.category}</p>
                </div>
                <div>
                  <span className="text-slate-600">Size:</span>
                  <p className="font-semibold text-slate-900">{request.hoarding_data.size}</p>
                </div>
                <div>
                  <span className="text-slate-600">Price/Day:</span>
                  <p className="font-semibold text-slate-900">${request.hoarding_data.price_per_day}</p>
                </div>
                <div>
                  <span className="text-slate-600">Requested:</span>
                  <p className="font-semibold text-slate-900">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.hoarding_id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Hoarding ID: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{request.hoarding_id}</strong>
                  </p>
                </div>
              )}
            </div>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No requests yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-6 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors"
              >
                Submit First Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Request New Hoarding
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                  placeholder="e.g., Beach Road Junction"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Location *</label>
                <input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                  placeholder="Detailed location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Area *</label>
                <input
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                  placeholder="e.g., Beach Road"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Size (WxH) *</label>
                <input
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                  placeholder="e.g., 20x10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                >
                  <option>Economy</option>
                  <option>Standard</option>
                  <option>Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Price per Day</label>
                <input
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md"
                  placeholder="Brief description..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentRequests;
