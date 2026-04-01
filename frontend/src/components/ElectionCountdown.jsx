import { useEffect, useState } from 'react';

const ELECTION_DURATION_HOURS = Number(import.meta.env.VITE_ELECTION_DURATION_HOURS || 24);

const formatMs = (ms) => {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const ElectionCountdown = ({ status }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (status !== 'active') {
      if (status === 'ended') {
        localStorage.removeItem('electionCountdownTarget');
      }
      setRemaining(0);
      return undefined;
    }

    const existingTarget = Number(localStorage.getItem('electionCountdownTarget') || 0);
    const validTarget = existingTarget > Date.now() ? existingTarget : Date.now() + ELECTION_DURATION_HOURS * 60 * 60 * 1000;
    localStorage.setItem('electionCountdownTarget', String(validTarget));

    const tick = () => {
      setRemaining(Math.max(validTarget - Date.now(), 0));
    };

    tick();
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [status]);

  if (status !== 'active') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        Countdown starts when election becomes active.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Election countdown</p>
      <p className="mt-1 font-display text-lg font-semibold text-brand-900">{formatMs(remaining)}</p>
    </div>
  );
};

export default ElectionCountdown;
