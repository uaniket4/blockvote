import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import CandidateCard from '../components/CandidateCard';
import ElectionCountdown from '../components/ElectionCountdown';
import Navbar from '../components/Navbar';
import WalletIndicator from '../components/WalletIndicator';

const VoterDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('setup');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, statusRes, candidateRes] = await Promise.all([
          api.get('/voter/me'),
          api.get('/voter/election-status'),
          api.get('/voter/candidates'),
        ]);

        setUser(userRes.data.user);
        setStatus(statusRes.data.status);
        setCandidates(candidateRes.data.candidates || []);
      } catch (_err) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const statusStyles = {
    setup: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    ended: 'bg-slate-200 text-slate-700',
  };

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Navbar
          subtitle="Voter workspace"
          title="Dashboard"
          actions={(
            <>
              <Link className="btn-secondary" to="/results">View Results</Link>
              <button className="btn-secondary" onClick={logout}>Logout</button>
            </>
          )}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <WalletIndicator />
          <ElectionCountdown status={status} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="panel hover-card animate-fade-up md:col-span-2" style={{ animationDelay: '70ms' }}>
            <h2 className="font-display text-xl font-semibold text-slate-900">Voter Profile</h2>
            {loading ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{user?.fullName || '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Email</p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">{user?.email || '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Voting status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{user?.hasVoted ? 'Submitted' : 'Pending'}</p>
              </div>
              </div>
            )}
          </article>

          <article className="panel hover-card animate-fade-up" style={{ animationDelay: '130ms' }}>
            <h2 className="font-display text-xl font-semibold text-slate-900">Election</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center justify-between text-slate-600">
                <span>Status</span>
                <span className={`status-chip ${statusStyles[status] || 'bg-slate-200 text-slate-700'}`}>{status}</span>
              </p>
              <p className="flex items-center justify-between text-slate-600">
                <span>Candidate count</span>
                <span className="font-semibold text-slate-900">{candidates.length}</span>
              </p>
            </div>
            <div className="mt-5 space-y-2">
              {!user?.hasVoted && status === 'active' ? (
                <Link className="btn-primary w-full" to="/vote">Go to Vote Page</Link>
              ) : (
                <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  {user?.hasVoted
                    ? 'Your vote has already been submitted. Each voter can vote only once.'
                    : 'Voting is available only while the election is active.'}
                </p>
              )}
              <Link className="btn-secondary w-full" to="/results">Open Results Board</Link>
            </div>
          </article>
        </div>

        <section className="panel animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-slate-900">Candidates</h2>
            <p className="text-sm text-slate-500">Live roster snapshot</p>
          </div>
          {loading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="skeleton h-56" />
              <div className="skeleton h-56" />
              <div className="skeleton h-56" />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate, index) => (
                <CandidateCard candidate={candidate} imageSeed="dashboard" serialNumber={index + 1} />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default VoterDashboard;
