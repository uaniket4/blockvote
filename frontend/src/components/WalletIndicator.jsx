import { useEffect, useState } from 'react';
import { connectWallet, getWalletConnectionStatus } from '../services/blockchain';

const shortAddress = (address) => {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const modeLabel = (mode) => {
  if (mode === 'ganache-dev-wallet') return 'Ganache';
  if (mode === 'metamask') return 'MetaMask';
  return 'Wallet';
};

const WalletIndicator = () => {
  const [wallet, setWallet] = useState({ connected: false, address: '', mode: 'unknown' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshWalletStatus = async () => {
    setLoading(true);
    setError('');
    const status = await getWalletConnectionStatus();
    setWallet(status);
    if (status.error) {
      setError(status.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshWalletStatus();
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      const { address, mode } = await connectWallet();
      setWallet({ connected: true, address, mode });
    } catch (err) {
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs backdrop-blur">
      <span className={`h-2.5 w-2.5 rounded-full ${wallet.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span className="font-semibold text-slate-700">
        {loading ? 'Checking wallet...' : wallet.connected ? shortAddress(wallet.address) : 'Wallet disconnected'}
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium capitalize text-slate-500">
        {modeLabel(wallet.mode)}
      </span>
      {!wallet.connected && !loading && (
        <button className="btn-secondary !px-3 !py-1.5" onClick={handleConnect} type="button">
          Connect / Retry
        </button>
      )}
      {error && <span className="text-rose-500">{error === 'Failed to fetch' ? 'Unable to reach wallet provider. Start Ganache or connect MetaMask.' : error}</span>}
    </div>
  );
};

export default WalletIndicator;
