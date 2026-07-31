import React, { useState } from 'react';

interface Proposal {
  id: number;
  title: string;
  votesFor: number;
  votesAgainst: number;
}

export const GovernanceVoting: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([
    { id: 1, title: 'WIP-12: Reduce Staking Fee to 0.5%', votesFor: 1420, votesAgainst: 120 },
    { id: 2, title: 'WIP-13: Add Arbitrum Vault Support', votesFor: 980, votesAgainst: 340 }
  ]);

  const handleVote = (id: number, support: boolean) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              votesFor: support ? p.votesFor + 1 : p.votesFor,
              votesAgainst: !support ? p.votesAgainst + 1 : p.votesAgainst
            }
          : p
      )
    );
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl">
      <h2 className="text-xl font-bold mb-4">Governance Proposals</h2>
      <div className="space-y-4">
        {proposals.map((p) => (
          <div key={p.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="font-semibold text-md mb-2">{p.title}</h3>
            <div className="flex gap-4 items-center mb-3 text-sm">
              <span className="text-emerald-400">For: {p.votesFor}</span>
              <span className="text-red-400">Against: {p.votesAgainst}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleVote(p.id, true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium"
              >
                Vote For
              </button>
              <button
                onClick={() => handleVote(p.id, false)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs font-medium"
              >
                Vote Against
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
