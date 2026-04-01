import { BrowserProvider, Contract, JsonRpcProvider, Wallet } from 'ethers';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const GANACHE_RPC_URL = import.meta.env.VITE_GANACHE_RPC_URL || 'http://127.0.0.1:7545';
const DEV_PRIVATE_KEY = import.meta.env.VITE_DEV_PRIVATE_KEY;
const RUNTIME_CONTRACT_KEY = 'runtimeContractAddress';

const isHexPrivateKey = (value) => {
  if (!value) {
    return false;
  }

  const stripped = value.startsWith('0x') ? value.slice(2) : value;
  return /^[0-9a-fA-F]{64}$/.test(stripped);
};

const CONTRACT_ABI = [
  'function addCandidate(uint256 _id, string _name, string _party) external',
  'function startElection() external',
  'function endElection() external',
  'function vote(uint256 _candidateId) external',
  'function getAllCandidates() external view returns (tuple(uint256 id, string name, string party, uint256 voteCount, bool exists)[])',
  'function hasVoted(address) external view returns (bool)',
  'function getElectionState() external view returns (bool started, bool ended)'
];

export const setRuntimeContractAddress = (address) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (address) {
    localStorage.setItem(RUNTIME_CONTRACT_KEY, address);
  } else {
    localStorage.removeItem(RUNTIME_CONTRACT_KEY);
  }
};

export const getActiveContractAddress = () => {
  if (typeof window !== 'undefined') {
    const runtimeAddress = localStorage.getItem(RUNTIME_CONTRACT_KEY);
    if (runtimeAddress) {
      return runtimeAddress;
    }
  }

  return CONTRACT_ADDRESS;
};

export const connectWallet = async () => {
  if (window.ethereum) {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return { provider, signer, address, mode: 'metamask' };
  }

  try {
    const provider = new JsonRpcProvider(GANACHE_RPC_URL);
    let signer;

    if (isHexPrivateKey(DEV_PRIVATE_KEY)) {
      signer = new Wallet(DEV_PRIVATE_KEY, provider);
    } else {
      // Ganache exposes unlocked development accounts over JSON-RPC.
      signer = await provider.getSigner(0);
    }

    const address = await signer.getAddress();

    return { provider, signer, address, mode: 'ganache-dev-wallet' };
  } catch (_error) {
    throw new Error(`Unable to reach Ganache at ${GANACHE_RPC_URL}. Start Ganache or connect MetaMask.`);
  }
};

export const getWalletConnectionStatus = async () => {
  try {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_accounts', []);

      if (accounts.length > 0) {
        return { connected: true, address: accounts[0], mode: 'metamask' };
      }

      return { connected: false, address: '', mode: 'metamask' };
    }

    const provider = new JsonRpcProvider(GANACHE_RPC_URL);

    try {
      let signer;

      if (isHexPrivateKey(DEV_PRIVATE_KEY)) {
        signer = new Wallet(DEV_PRIVATE_KEY, provider);
      } else {
        signer = await provider.getSigner(0);
      }

      const address = await signer.getAddress();
      return { connected: true, address, mode: 'ganache-dev-wallet' };
    } catch (_err) {
      return {
        connected: false,
        address: '',
        mode: 'ganache-dev-wallet',
        error: `Ganache RPC unavailable at ${GANACHE_RPC_URL}`,
      };
    }
  } catch (error) {
    return { connected: false, address: '', mode: 'metamask', error: error.message || 'Wallet check failed' };
  }
};

export const getVotingContract = async () => {
  const activeAddress = getActiveContractAddress();

  if (!activeAddress) {
    throw new Error('Contract address missing. Set VITE_CONTRACT_ADDRESS in frontend/.env');
  }

  const { signer } = await connectWallet();
  return new Contract(activeAddress, CONTRACT_ABI, signer);
};
