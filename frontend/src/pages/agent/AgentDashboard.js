import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { MapPin, LogOut, Upload, FileText } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hoardings, setHoardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHoarding, setSelectedHoarding] = useState(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchHoardings();
  }, []);

  const fetchHoardings = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/agent/hoardings`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setHoardings(response.data.hoardings);
    } catch (error) {
      toast.error('Failed to load hoardings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceUpdate = async () => {
    if (!selectedHoarding || !maintenanceStatus) {
      toast.error('Please select status');
      return;
    }

    setUpdating(true);

    try {
      const token = localStorage.getItem('session_token');
      await axios.post(
        `${API}/agent/maintenance`,
        {
          hoarding_id: selectedHoarding.hoarding_id,
          status: maintenanceStatus,
          notes: notes,
          images: []
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      toast.success('Maintenance status updated successfully');
      setSelectedHoarding(null);
      setMaintenanceStatus('');
      setNotes('');
      fetchHoardings();
    } catch (error) {
      toast.error('Failed to update maintenance status');
      console.error(error);
    } finally {
      setUpdating(false);
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
            <div>
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: 'Chivo, sans-serif' }}
                data-testid="agent-dashboard-title"
              >
                Agent Dashboard
              </h1>
              <p className="text-sm text-slate-600">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                data-testid="my-requests-btn"
                onClick={() => navigate('/agent/requests')}
                className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                My Requests
              </button>
              <button
                data-testid="logout-btn"
                onClick={logout}
                className="flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600">Total Hoardings</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{hoardings.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600">Under Maintenance</p>
            <p className="text-2xl font-bold text-[#F97316] mt-1">
              {hoardings.filter((h) => h.status === 'Maintenance').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600">Active</p>
            <p className="text-2xl font-bold text-[#22C55E] mt-1">
              {hoardings.filter((h) => h.status === 'Available' || h.status === 'Booked').length}
            </p>
          </div>
        </div>

        {/* Hoardings List */}
        <div className="space-y-4">
          {hoardings.map((hoarding) => (
            <div
              key={hoarding.hoarding_id}
              data-testid={`hoarding-item-${hoarding.hoarding_id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                      {hoarding.title}
                    </h3>
                    <StatusBadge status={hoarding.status} />
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    {hoarding.location}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="bg-slate-100 px-2 py-1 rounded">{hoarding.category}</span>
                    <span className="bg-slate-100 px-2 py-1 rounded">{hoarding.size}</span>
                    <span className="bg-slate-100 px-2 py-1 rounded">{hoarding.area}</span>
                  </div>
                </div>

                <button
                  data-testid={`update-btn-${hoarding.hoarding_id}`}
                  onClick={() => {
                    setSelectedHoarding(hoarding);
                    setMaintenanceStatus(hoarding.status);
                  }}
                  className="px-4 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors whitespace-nowrap"
                >
                  Update Status
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Update Modal */}
        {selectedHoarding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full" data-testid="maintenance-modal">
              <h2
                className="text-xl font-bold text-slate-900 mb-4"
                style={{ fontFamily: 'Chivo, sans-serif' }}
              >
                Update Maintenance Status
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hoarding</label>
                  <p className="text-sm text-slate-600">{selectedHoarding.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    data-testid="status-select"
                    value={maintenanceStatus}
                    onChange={(e) => setMaintenanceStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
                  >
                    <option value="Available">Available</option>
                    <option value="Maintenance">Under Maintenance</option>
                    <option value="Booked">Booked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    data-testid="notes-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
                    placeholder="Add maintenance notes..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedHoarding(null);
                      setMaintenanceStatus('');
                      setNotes('');
                    }}
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    data-testid="submit-maintenance-btn"
                    onClick={handleMaintenanceUpdate}
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
