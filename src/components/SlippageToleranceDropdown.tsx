import React, { useState } from 'react';

export const SlippageToleranceDropdown: React.FC = () => {
  const [slippage, setSlippage] = useState('0.5%');

  return (
    <div className="flex gap-2 items-center bg-slate-800 p-2 rounded-lg text-xs text-white">
      <span>Slippage:</span>
      {['0.1%', '0.5%', '1.0%'].map((opt) => (
        <button
          key={opt}
          onClick={() => setSlippage(opt)}
          className={`px-2 py-1 rounded ${slippage === opt ? 'bg-blue-600 font-bold' : 'bg-slate-700'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
