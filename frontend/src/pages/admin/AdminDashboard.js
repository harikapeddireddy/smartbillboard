import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Package, AlertTriangle, LogOut, FileText } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      };

      const [statsRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, config),
        axios.get(`${API}/admin/recent-bookings`, config)
      ]);

      setStats(statsRes.data);
      setRecentBookings(bookingsRes.data.bookings);
      
      // Fetch monthly revenue data for the year
      const revenueData = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let month = 1; month <= 12; month++) {
        try {
          const revRes = await axios.get(
            `${API}/admin/revenue?month=${month}&year=${selectedYear}`,
            config
          );
          revenueData.push({
            name: months[month - 1],
            revenue: revRes.data.revenue
          });
        } catch (err) {
          revenueData.push({
            name: months[month - 1],
            revenue: 0
          });
        }
      }
      
      setMonthlyRevenue(revenueData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2]"></div>
      </div>
    );
  }

  const categoryData = [
    { name: 'Premium', value: stats.category_breakdown.premium, color: '#0056D2' },
    { name: 'Standard', value: stats.category_breakdown.standard, color: '#3B82F6' },
    { name: 'Economy', value: stats.category_breakdown.economy, color: '#93C5FD' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }} data-testid="admin-dashboard-title">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-600">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              data-testid="view-requests-btn"
              onClick={() => navigate('/admin/requests')}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Requests
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Month/Year Filter */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Filter Revenue:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20"
            >
              <option value={1}>January</option>
              <option value={2}>February</option>
              <option value={3}>March</option>
              <option value={4}>April</option>
              <option value={5}>May</option>
              <option value={6}>June</option>
              <option value={7}>July</option>
              <option value={8}>August</option>
              <option value={9}>September</option>
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#0056D2]/20"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#0056D2]/90 transition-colors"
            >
              Apply Filter
            </button>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="total-hoardings-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Hoardings</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total_hoardings}</p>
              </div>
              <Package className="w-10 h-10 text-[#0056D2] opacity-20" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="available-hoardings-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Available</p>
                <p className="text-3xl font-bold text-[#22C55E] mt-2">{stats.available_hoardings}</p>
              </div>
              <div className="w-3 h-3 bg-[#22C55E] rounded-full"></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="booked-hoardings-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Booked</p>
                <p className="text-3xl font-bold text-[#EF4444] mt-2">{stats.booked_hoardings}</p>
              </div>
              <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="in-process-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In-Process</p>
                <p className="text-3xl font-bold text-[#F59E0B] mt-2">{stats.in_process}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-[#F59E0B] opacity-20" />
            </div>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="monthly-revenue-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">₹{stats.monthly_revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[#0056D2]" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="yearly-revenue-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Yearly Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">₹{stats.yearly_revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[#22C55E]" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" data-testid="growth-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Revenue Growth</p>
                <p className="text-2xl font-bold text-[#22C55E] mt-2">+{stats.revenue_growth}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#22C55E]" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Monthly Income
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#0056D2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Category Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Recent Bookings
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="recent-bookings-table">
              <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Booking ID</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Hoarding</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.booking_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {booking.booking_id}
                    </td>
                    <td className="px-4 py-3">{booking.user_name}</td>
                    <td className="px-4 py-3">{booking.hoarding_title}</td>
                    <td className="px-4 py-3 font-semibold">₹{booking.amount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
