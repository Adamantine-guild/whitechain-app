import React, { useState } from 'react';

interface SlippageProps {
  onSlippageChange?: (value: number) => void;
}

export const SlippageDropdown: React.FC<SlippageProps> = ({ onSlippageChange }) => {
  const [slippage, setSlippage] = useState<number>(0.5);

  const handleSelect = (val: number) => {
    setSlippage(val);
    if (onSlippageChange) onSlippageChange(val);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Slippage Tolerance:</span>
      {[0.1, 0.5, 1.0].map((val) => (
        <button
          key={val}
          onClick={() => handleSelect(val)}
          className={`px-3 py-1 text-xs rounded-md transition-all ${
            slippage === val
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {val}%
        </button>
      ))}
    </div>
  );
};
