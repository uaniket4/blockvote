import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CandidateCard from '../components/CandidateCard';
import { getVotingContract, setRuntimeContractAddress } from '../services/blockchain';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import WalletIndicator from '../components/WalletIndicator';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [party, setParty] = useState('');
  const [status, setStatus] = useState('setup');
  const [candidates, setCandidates] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const parseEthersError = (err, fallback) => {
    if (err?.shortMessage) return err.shortMessage;
    if (err?.reason) return err.reason;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.message) return err.message;
    return fallback;
  };

  const loadData = async () => {
    try {
      const [statusRes, cRes] = await Promise.all([
        api.get('/voter/election-status'),
        api.get('/voter/candidates'),
      ]);
      setStatus(statusRes.data.status);
      setCandidates(cRes.data.candidates || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const addCandidate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const contract = await getVotingContract();
      const [started, ended] = await contract.getElectionState();

      if (started && !ended) {
        setError('Cannot add candidate after election has started on blockchain.');
        return;
      }

      if (started && ended) {
        setError('This election contract is closed. Deploy a new contract to start a new election cycle with new candidates.');
        return;
      }

      const { data } = await api.post('/admin/candidates', { name, party });
      const tx = await contract.addCandidate(data.candidate.id, name, party);
      await tx.wait();

      setMessage('Candidate added in MySQL and blockchain');
      setName('');
      setParty('');
      await loadData();
    } catch (err) {
      setError(parseEthersError(err, 'Failed to add candidate'));
    }
  };

  const startElection = async () => {
    setError('');
    setMessage('');

    try {
      let contract = await getVotingContract();
      let [started, ended] = await contract.getElectionState();

      if (started && ended) {
        setMessage('Previous cycle ended. Deploying a fresh contract automatically...');
        const { data } = await api.post('/admin/election/new-cycle');

        if (!data?.contractAddress) {
          setError('Fresh contract deployed but no address was returned by backend.');
          return;
        }

        setRuntimeContractAddress(data.contractAddress);
        contract = await getVotingContract();
        [started, ended] = await contract.getElectionState();
      }

      const [chainCandidates, dbCandidatesRes] = await Promise.all([
        contract.getAllCandidates(),
        api.get('/voter/candidates'),
      ]);
      const dbCandidates = dbCandidatesRes.data.candidates || [];

      if (started && !ended) {
        setMessage('Election is already active on blockchain');
        return;
      }

      // Auto-sync missing candidates when DB has rows but blockchain is missing entries.
      const chainIds = new Set(chainCandidates.map((candidate) => Number(candidate.id)));
      const missingCandidates = dbCandidates.filter((candidate) => !chainIds.has(Number(candidate.id)));

      if (missingCandidates.length > 0) {
        setMessage(`Syncing ${missingCandidates.length} candidate(s) to blockchain...`);

        for (const candidate of missingCandidates) {
          const addTx = await contract.addCandidate(Number(candidate.id), candidate.name, candidate.party);
          await addTx.wait();
        }
      }

      const refreshedChainCandidates = await contract.getAllCandidates();
      if (!refreshedChainCandidates || refreshedChainCandidates.length === 0) {
        setError('No candidates on blockchain. Add candidates in admin and retry start election.');
        return;
      }

      const tx = await contract.startElection();
      await tx.wait();

      await api.put('/admin/election/start');

      setMessage('Election started');
      await loadData();
    } catch (err) {
      const parsed = parseEthersError(err, 'Failed to start election');
      if (String(parsed).toLowerCase().includes('missing revert data')) {
        setError('Unable to start election on blockchain. Ensure at least one candidate is synced and the contract has not already completed an election cycle.');
        return;
      }
      setError(parsed);
    }
  };

  const endElection = async () => {
    setError('');
    setMessage('');

    try {
      const contract = await getVotingContract();
      const [started, ended] = await contract.getElectionState();

      if (!started) {
        setError('Election has not started on blockchain yet. Start election first.');
        return;
      }

      if (ended) {
        setMessage('Election is already ended on blockchain');
        return;
      }

      const tx = await contract.endElection();
      await tx.wait();

      await api.put('/admin/election/end');

      setMessage('Election ended');
      await loadData();
    } catch (err) {
      setError(parseEthersError(err, 'Failed to end election'));
    }
  };

  const deleteCandidate = async (candidateId) => {
    setError('');
    setMessage('');

    try {
      await api.delete(`/admin/candidates/${candidateId}`);
      setMessage('Candidate deleted');
      await loadData();
    } catch (err) {
      setError(parseEthersError(err, 'Failed to delete candidate'));
    }
  };

  const statusStyles = {
    setup: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    ended: 'bg-slate-200 text-slate-700',
  };

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[270px_1fr]">
        <Sidebar
          title="Election Control"
          subtitle="Operate candidate setup, election lifecycle, and final reporting."
          navItems={[
            { href: '#candidate-form', label: 'Add Candidate', active: true },
            { href: '#election-control', label: 'Election Control' },
            { href: '#candidate-list', label: 'Candidate List' },
          ]}
          footer={(
            <div className="space-y-2">
              <button className="btn-secondary w-full" onClick={() => navigate('/results')}>Open Results</button>
              <button className="btn-secondary w-full" onClick={logout}>Logout</button>
              <WalletIndicator />
            </div>
          )}
        />

        <div className="space-y-5">
          <Navbar subtitle="Admin workspace" title="Panel" />
          <section id="candidate-form" className="panel hover-card animate-fade-up" style={{ animationDelay: '70ms' }}>
            <h2 className="font-display text-xl font-semibold text-slate-900">Add Candidate</h2>
            <p className="mt-1 text-sm text-slate-500">Create candidate records in MySQL and mirror them to blockchain.</p>
            <form onSubmit={addCandidate} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Candidate name" required />
              <input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder="Party" required />
              <button className="btn-primary sm:col-span-2" type="submit">Add Candidate</button>
            </form>
          </section>

          <section id="election-control" className="panel hover-card animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-900">Election Control</h2>
                <p className="mt-1 text-sm text-slate-500">Start or end election based on readiness and blockchain state.</p>
              </div>
              <span className={`status-chip ${statusStyles[status] || 'bg-slate-200 text-slate-700'}`}>Status: {status}</span>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary" onClick={startElection}>Start Election</button>
              <button className="btn-secondary" onClick={endElection}>End Election</button>
            </div>
          </section>

          <section id="candidate-list" className="panel animate-fade-up" style={{ animationDelay: '170ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-slate-900">Candidate List</h2>
              <p className="text-sm text-slate-500">{candidates.length} total</p>
            </div>
            {loading ? (
              <div className="mt-4 space-y-3">
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {candidates.map((c, index) => (
                <div key={c.id} className="relative">
                  <CandidateCard candidate={c} imageSeed="admin" compact serialNumber={index + 1} />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <button className="btn-secondary" type="button" onClick={() => deleteCandidate(c.id)}>Delete</button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </section>

          {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p>}
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
        </div>
      </section>
    </main>
  );
};

export default AdminPanel;
