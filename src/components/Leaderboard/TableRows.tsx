import React from "react";

export interface LeaderboardEntry {
  rank: number;
  address: string;
  amount: string;
}

interface TableRowsProps {
  data: LeaderboardEntry[];
}

export const TableRows: React.FC<TableRowsProps> = ({ data }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Desktop Header: Visible on md screens and above (>= 768px) */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 bg-gray-100 dark:bg-gray-800 p-4 font-semibold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-2">Rank</div>
        <div className="col-span-6">Address</div>
        <div className="col-span-4 text-right">Staked Amount</div>
      </div>

      {/* Rows Container: Stacked Cards on Mobile (< 768px), Data Table Rows on Desktop (>= 768px) */}
      <div className="flex flex-col gap-3 md:gap-0">
        {data.map((item) => (
          <div
            key={item.address}
            className="flex flex-col md:grid md:grid-cols-12 md:gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl md:rounded-none md:border-b md:border-x-0 md:border-t-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors shadow-sm md:shadow-none"
          >
            {/* Rank */}
            <div className="flex justify-between items-center md:col-span-2 mb-2 md:mb-0">
              <span className="md:hidden text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Rank
              </span>
              <span className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                #{item.rank}
              </span>
            </div>

            {/* Address */}
            <div className="flex justify-between items-center md:col-span-6 mb-2 md:mb-0">
              <span className="md:hidden text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Address
              </span>
              <span className="font-mono text-xs md:text-sm text-gray-700 dark:text-gray-300 truncate max-w-[180px] sm:max-w-[280px] md:max-w-none">
                {item.address}
              </span>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center md:col-span-4 md:text-right">
              <span className="md:hidden text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Staked Amount
              </span>
              <span className="font-bold text-sm md:text-base text-indigo-600 dark:text-indigo-400">
                {item.amount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableRows;
