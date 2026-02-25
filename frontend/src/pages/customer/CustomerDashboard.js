import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Search, Filter, MapPin, DollarSign, LogOut, BookOpen } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hoardings, setHoardings] = useState([]);
  const [filteredHoardings, setFilteredHoardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchHoardings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, categoryFilter, statusFilter, hoardings]);

  const fetchHoardings = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await axios.get(`${API}/hoardings`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setHoardings(response.data.hoardings);
      setFilteredHoardings(response.data.hoardings);
    } catch (error) {
      toast.error('Failed to load hoardings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = hoardings;

    if (searchTerm) {
      filtered = filtered.filter(
        (h) =>
          h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.area.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter((h) => h.category === categoryFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((h) => h.status === statusFilter);
    }

    setFilteredHoardings(filtered);
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
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: 'Chivo, sans-serif' }}
                data-testid="customer-dashboard-title"
              >
                Browse Hoardings
              </h1>
              <p className="text-sm text-slate-600">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                data-testid="my-bookings-btn"
                onClick={() => navigate('/customer/bookings')}
                className="flex items-center px-4 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                My Bookings
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

      {/* Filters */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                data-testid="search-input"
                type="text"
                placeholder="Search by location or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                data-testid="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
              >
                <option>All</option>
                <option>Premium</option>
                <option>Normal</option>
                <option>Economy</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                data-testid="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-3 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2]"
              >
                <option>All</option>
                <option>Available</option>
                <option>Booked</option>
                <option>Maintenance</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Hoardings Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-slate-600 mb-4">
          Showing {filteredHoardings.length} of {hoardings.length} hoardings
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredHoardings.map((hoarding) => (
            <div
              key={hoarding.hoarding_id}
              data-testid={`hoarding-card-${hoarding.hoarding_id}`}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/customer/hoardings/${hoarding.hoarding_id}`)}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={hoarding.images[0]}
                  alt={hoarding.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={hoarding.status} />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-slate-900 mb-2 line-clamp-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {hoarding.title}
                </h3>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="line-clamp-1">{hoarding.location}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">{hoarding.category}</span>
                    <span className="text-xs text-slate-500">{hoarding.size}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-[#0056D2]" />
                      <span className="font-bold text-slate-900">${hoarding.price_per_day}</span>
                      <span className="text-xs text-slate-500 ml-1">/day</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredHoardings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">No hoardings found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
