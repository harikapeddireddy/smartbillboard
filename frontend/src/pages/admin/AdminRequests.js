import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Check, X } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/admin/hoarding-requests`, {
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

  const handleApprove = async (requestId) => {
    setProcessing(requestId);
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.post(
        `${API}/admin/approve-hoarding/${requestId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      toast.success(`Approved! Hoarding ID: ${response.data.hoarding_id}`);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Rejection reason (optional):');
    
    setProcessing(requestId);
    try {
      const token = localStorage.getItem('session_token');
      await axios.post(
        `${API}/admin/reject-hoarding/${requestId}?reason=${encodeURIComponent(reason || '')}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      toast.success('Request rejected');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject request');
    } finally {
      setProcessing(null);
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
            onClick={() => navigate('/admin/dashboard')}
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
          data-testid="admin-requests-title"
        >
          Hoarding Requests
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-2xl font-bold text-[#F59E0B] mt-1">
              {requests.filter((r) => r.status === 'Pending').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600">Approved</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">
              {requests.filter((r) => r.status === 'Approved').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600">Rejected</p>
            <p className="text-2xl font-bold text-[#EF4444] mt-1">
              {requests.filter((r) => r.status === 'Rejected').length}
            </p>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.request_id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
              data-testid={`request-${request.request_id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    {request.hoarding_data.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{request.hoarding_data.location}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Requested by: {request.agent_name} on {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-slate-600">Area:</span>
                  <p className="font-semibold text-slate-900">{request.hoarding_data.area}</p>
                </div>
                <div>
                  <span className="text-slate-600">Category:</span>
                  <p className="font-semibold text-slate-900">{request.hoarding_data.category}</p>
                </div>
                <div>
                  <span className="text-slate-600">Size:</span>
                  <p className="font-semibold text-slate-900">{request.hoarding_data.size}</p>
                </div>
                <div>
                  <span className="text-slate-600">Type:</span>
                  <p className="font-semibold text-slate-900">{request.hoarding_data.type}</p>
                </div>
                <div>
                  <span className="text-slate-600">Price/Day:</span>
                  <p className="font-semibold text-slate-900">${request.hoarding_data.price_per_day}</p>
                </div>
              </div>

              {request.hoarding_data.description && (
                <p className="text-sm text-slate-600 mb-4">{request.hoarding_data.description}</p>
              )}

              {request.status === 'Pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    data-testid={`approve-btn-${request.request_id}`}
                    onClick={() => handleApprove(request.request_id)}
                    disabled={processing === request.request_id}
                    className="flex items-center px-4 py-2 bg-[#22C55E] text-white rounded-md hover:bg-[#22C55E]/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                  <button
                    data-testid={`reject-btn-${request.request_id}`}
                    onClick={() => handleReject(request.request_id)}
                    disabled={processing === request.request_id}
                    className="flex items-center px-4 py-2 bg-[#EF4444] text-white rounded-md hover:bg-[#EF4444]/90 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </button>
                </div>
              )}

              {request.hoarding_id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Generated Hoarding ID:{' '}
                    <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{request.hoarding_id}</strong>
                  </p>
                </div>
              )}
            </div>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No hoarding requests yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequests;
