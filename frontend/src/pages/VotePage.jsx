import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CandidateCard from '../components/CandidateCard';
import { connectWallet, getVotingContract } from '../services/blockchain';
import ElectionCountdown from '../components/ElectionCountdown';
import Navbar from '../components/Navbar';
import VoteModal from '../components/VoteModal';
import WalletIndicator from '../components/WalletIndicator';

const VotePage = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [voteSuccess, setVoteSuccess] = useState(false);

  const parseEthersError = (err, fallback) => {
    if (err?.shortMessage) return err.shortMessage;
    if (err?.reason) return err.reason;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.message) return err.message;
    return fallback;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [candidateRes, statusRes, meRes] = await Promise.all([
          api.get('/voter/candidates'),
          api.get('/voter/election-status'),
          api.get('/voter/me'),
        ]);

        if (meRes.data.user.hasVoted) {
          setError('You already voted.');
        }

        setCandidates(candidateRes.data.candidates || []);
        setStatus(statusRes.data.status);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load vote page data');
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, []);

  const submitVote = async () => {
    setError('');

    if (!selected) {
      setError('Select a candidate before voting.');
      return;
    }

    if (status !== 'active') {
      setError('Election is not active.');
      return;
    }

    setLoading(true);

    try {
      const { address } = await connectWallet();
      const contract = await getVotingContract();

      const [started, ended] = await contract.getElectionState();
      if (!started || ended) {
        setError('Election is not active on blockchain.');
        return;
      }

      const votedOnChain = await contract.hasVoted(address);
      if (votedOnChain) {
        setError('This wallet has already voted on blockchain.');
        return;
      }

      const chainCandidates = await contract.getAllCandidates();
      const existsOnChain = chainCandidates.some((c) => Number(c.id) === Number(selected));
      if (!existsOnChain) {
        setError('Selected candidate is not available on blockchain. Ask admin to sync candidates.');
        return;
      }

      const tx = await contract.vote(Number(selected));
      const receipt = await tx.wait();

      await api.post('/voter/vote-record', {
        candidateId: Number(selected),
        txHash: receipt.hash,
        walletAddress: address,
      });

      setOpenConfirm(false);
      setVoteSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1700);
    } catch (err) {
      setError(parseEthersError(err, 'Voting failed'));
    } finally {
      setLoading(false);
    }
  };

  const selectedCandidate = candidates.find((candidate) => String(candidate.id) === String(selected));

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <Navbar
          subtitle="Voting booth"
          title="Cast your vote"
          actions={<button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <WalletIndicator />
          <ElectionCountdown status={status} />
        </div>

        <section className="panel animate-fade-up" style={{ animationDelay: '90ms' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-slate-900">Candidate List</h2>
            <span className="status-chip bg-brand-50 text-brand-700">Election: {status || 'loading'}</span>
          </div>
          {pageLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="skeleton h-64" />
              <div className="skeleton h-64" />
              <div className="skeleton h-64" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {candidates.map((candidate, index) => {
              const checked = String(selected) === String(candidate.id);
              return (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  imageSeed="vote"
                  serialNumber={index + 1}
                  selectable
                  selected={checked}
                  onSelect={(candidateId) => setSelected(String(candidateId))}
                />
              );
              })}
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={() => setSelected('')}>Clear Selection</button>
            <button className="btn-primary animate-pulseGlow" disabled={loading} onClick={() => setOpenConfirm(true)}>
              {loading ? 'Submitting on blockchain...' : 'Submit Vote'}
            </button>
          </div>
        </section>
      </section>

      <VoteModal
        open={openConfirm}
        title="Confirm your vote"
        body={selectedCandidate
          ? `You are about to vote for ${selectedCandidate.name} (${selectedCandidate.party}). This action is final.`
          : 'Please choose a candidate first.'}
        onCancel={() => setOpenConfirm(false)}
        onConfirm={submitVote}
        confirmText="Confirm Vote"
        confirmDisabled={!selectedCandidate || loading}
      />

      {voteSuccess && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="panel success-ring w-full max-w-sm text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100">
              <svg viewBox="0 0 24 24" className="h-11 w-11 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="mt-4 font-display text-2xl font-semibold text-slate-900">Vote Recorded</h3>
            <p className="mt-2 text-sm text-slate-600">Your transaction has been confirmed on-chain. Redirecting to dashboard.</p>
          </div>
        </div>
      )}
    </main>
  );
};

export default VotePage;
