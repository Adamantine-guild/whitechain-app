import React from 'react';

export const AsyncSkeletonLoaders: React.FC = () => {
  return (
    <div className="animate-pulse space-y-3 p-4 bg-slate-800 rounded-lg">
      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
      <div className="h-4 bg-slate-700 rounded w-1/2"></div>
      <div className="h-8 bg-slate-700 rounded w-full"></div>
    </div>
  );
};
