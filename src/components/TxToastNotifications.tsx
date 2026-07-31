import React from 'react';

interface NotificationProps {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  txHash: string;
}

export const TxToastNotifications: React.FC<NotificationProps> = ({ status, txHash }) => {
  return (
    <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white">
      <p className="font-bold">Transaction Status: {status}</p>
      <p className="text-gray-400 font-mono">Hash: {txHash.slice(0, 10)}...</p>
    </div>
  );
};
