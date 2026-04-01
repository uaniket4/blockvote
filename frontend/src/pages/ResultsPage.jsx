import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ResultsChart from '../components/ResultsChart';
import { getVotingContract } from '../services/blockchain';
import WalletIndicator from '../components/WalletIndicator';

const ResultsPage = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const contract = await getVotingContract();
        const candidates = await contract.getAllCandidates();
        const parsed = candidates.map((c) => ({
          id: Number(c.id),
          name: c.name,
          party: c.party,
          voteCount: Number(c.voteCount),
        }));
        setRows(parsed);
      } catch (err) {
        setError(err.reason || err.message || 'Failed to fetch blockchain results');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  const totalVotes = rows.reduce((sum, row) => sum + row.voteCount, 0);
  const leader = rows.reduce((best, row) => (row.voteCount > (best?.voteCount || 0) ? row : best), null);
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Navbar
          subtitle="Results center"
          title="Election Results"
          actions={<Link className="btn-secondary" to="/dashboard">Back to Dashboard</Link>}
        />

        <WalletIndicator />

        <div className="grid gap-4 md:grid-cols-3">
          <article className="panel animate-fade-up" style={{ animationDelay: '70ms' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total votes</p>
            <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{totalVotes}</p>
          </article>
          <article className="panel animate-fade-up" style={{ animationDelay: '120ms' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Leading candidate</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{leader ? leader.name : 'N/A'}</p>
            <p className="text-sm text-slate-500">{leader ? leader.party : 'No votes yet'}</p>
          </article>
          <article className="panel animate-fade-up" style={{ animationDelay: '170ms' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Candidates</p>
            <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{rows.length}</p>
          </article>
        </div>

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="skeleton h-[22rem]" />
            <div className="skeleton h-[22rem]" />
          </div>
        ) : (
          <ResultsChart rows={rows} />
        )}

        <section className="panel animate-fade-up" style={{ animationDelay: '310ms' }}>
          <h2 className="font-display text-xl font-semibold text-slate-900">Detailed Results</h2>
          {rows.length > 0 ? (
            <div className="mt-4 space-y-3">
              {rows.map((r, index) => (
                <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-900">{r.name} <span className="font-normal text-slate-500">({r.party})</span></p>
                    <p className="text-sm font-semibold text-slate-700">Votes: {r.voteCount}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalVotes > 0 ? (r.voteCount / totalVotes) * 100 : 0}%`,
                        backgroundColor: ['#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#0891b2', '#0f766e'][index % 6],
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">No on-chain results available yet.</p>
          )}
          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
        </section>
      </section>
    </main>
  );
};

export default ResultsPage;
