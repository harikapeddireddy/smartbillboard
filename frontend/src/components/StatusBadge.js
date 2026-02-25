import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'Available':
        return 'bg-[#DCFCE7] text-[#22C55E] border-[#22C55E]';
      case 'Booked':
        return 'bg-[#FEE2E2] text-[#EF4444] border-[#EF4444]';
      case 'Maintenance':
      case 'Under Maintenance':
        return 'bg-[#FFEDD5] text-[#F97316] border-[#F97316]';
      case 'Active':
        return 'bg-[#DCFCE7] text-[#22C55E] border-[#22C55E]';
      case 'Confirmed':
      case 'Paid':
        return 'bg-[#DCFCE7] text-[#22C55E] border-[#22C55E]';
      case 'Pending':
        return 'bg-[#FEF3C7] text-[#F59E0B] border-[#F59E0B]';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-400';
    }
  };

  return (
    <span
      data-testid={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getStatusStyle()}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
