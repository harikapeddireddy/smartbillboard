import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Wrench } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1
              data-testid="landing-title"
              className="text-5xl md:text-6xl font-black tracking-tight text-slate-900"
              style={{ fontFamily: 'Chivo, sans-serif' }}
            >
              AdGrid
            </h1>
            <p className="mt-4 text-xl text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
              Smart Billboard Management System
            </p>
            <p className="mt-2 text-base text-slate-500">
              Digitizing outdoor advertisement hoardings for Smart Cities
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Admin Card */}
            <div
              data-testid="admin-role-card"
              className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate('/login?role=admin')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0056D2] bg-opacity-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 text-[#0056D2]" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Admin
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Smart City Authority Dashboard
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-500 text-left">
                  <li>• Revenue Analytics</li>
                  <li>• Hoarding Management</li>
                  <li>• Compliance Monitoring</li>
                </ul>
                <button
                  data-testid="admin-login-btn"
                  className="mt-6 w-full bg-[#0056D2] text-white py-2 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors"
                >
                  Admin Login
                </button>
              </div>
            </div>

            {/* Customer Card */}
            <div
              data-testid="customer-role-card"
              className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate('/login?role=customer')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0056D2] bg-opacity-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-[#0056D2]" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Customer
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Advertiser & Agency Portal
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-500 text-left">
                  <li>• Browse Hoardings</li>
                  <li>• Book & Pay Online</li>
                  <li>• Track Bookings</li>
                </ul>
                <button
                  data-testid="customer-login-btn"
                  className="mt-6 w-full bg-[#0056D2] text-white py-2 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors"
                >
                  Customer Login
                </button>
              </div>
            </div>

            {/* Agent Card */}
            <div
              data-testid="agent-role-card"
              className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate('/login?role=agent')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0056D2] bg-opacity-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="w-8 h-8 text-[#0056D2]" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Agent
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Field Maintenance Team
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-500 text-left">
                  <li>• Maintenance Updates</li>
                  <li>• Site Inspections</li>
                  <li>• Status Reports</li>
                </ul>
                <button
                  data-testid="agent-login-btn"
                  className="mt-6 w-full bg-[#0056D2] text-white py-2 rounded-md font-medium hover:bg-[#0056D2]/90 transition-colors"
                >
                  Agent Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-black text-[#0056D2]">274</div>
              <div className="mt-2 text-sm text-slate-400">Total Hoardings</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#0056D2]">475</div>
              <div className="mt-2 text-sm text-slate-400">Electric Poles</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#0056D2]">100%</div>
              <div className="mt-2 text-sm text-slate-400">Digital NOC</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#0056D2]">24/7</div>
              <div className="mt-2 text-sm text-slate-400">AI Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
