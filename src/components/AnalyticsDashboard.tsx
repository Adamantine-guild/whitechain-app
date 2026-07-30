import React from 'react';

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4">Portfolio Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-800 rounded-lg">
          <p className="text-xs text-gray-400">Total Net Value</p>
          <p className="text-2xl font-bold text-emerald-400">$48,250.00</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-lg">
          <p className="text-xs text-gray-400">Total Yield Earned</p>
          <p className="text-2xl font-bold text-blue-400">$2,140.50</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-lg">
          <p className="text-xs text-gray-400">Average APY</p>
          <p className="text-2xl font-bold text-purple-400">12.4%</p>
        </div>
      </div>
    </div>
  );
};
