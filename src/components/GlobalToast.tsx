import React from 'react';

interface ToastProps {
  message: string;
  txHash?: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const GlobalToast: React.FC<ToastProps> = ({
  message,
  txHash,
  type = 'success',
  onClose
}) => {
  const bgClass = type === 'success' ? 'bg-emerald-900 border-emerald-500 text-emerald-200' : 'bg-red-900 border-red-500 text-red-200';

  return (
    <div className={`fixed bottom-5 right-5 p-4 rounded-xl border shadow-xl flex items-center justify-between gap-4 z-50 ${bgClass}`}>
      <div>
        <p className="font-semibold text-sm">{message}</p>
        {txHash && (
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline text-blue-300 hover:text-blue-200"
          >
            View Transaction {txHash.slice(0, 8)}...
          </a>
        )}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">
          ✕
        </button>
      )}
    </div>
  );
};
