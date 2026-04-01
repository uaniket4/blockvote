require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const normalizePrivateKey = (value) => {
  if (!value) {
    return null;
  }

  const stripped = value.startsWith('0x') ? value.slice(2) : value;
  if (/^[0-9a-fA-F]{64}$/.test(stripped)) {
    return `0x${stripped}`;
  }

  return null;
};

const sepoliaPk = normalizePrivateKey(process.env.PRIVATE_KEY);
const ganachePk = normalizePrivateKey(process.env.GANACHE_PRIVATE_KEY);

module.exports = {
  solidity: '0.8.24',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    ganache: {
      url: process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545',
      accounts: ganachePk ? [ganachePk] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: sepoliaPk ? [sepoliaPk] : [],
    },
  },
};
