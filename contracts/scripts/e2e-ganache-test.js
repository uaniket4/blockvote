require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const RPC_URL = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS ||
  process.env.GANACHE_CONTRACT_ADDRESS ||
  '0x0E4d0d1aB6DE4ea57255Cf2B4d26d71120C9CCd5';

const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'Voting.sol', 'Voting.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

async function api(pathname, options = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_e) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(`${pathname} failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const adminSigner = await provider.getSigner(0);
  const voterSigner = await provider.getSigner(1);

  const adminWalletAddress = await adminSigner.getAddress();
  const voterWalletAddress = await voterSigner.getAddress();

  console.log('Admin wallet:', adminWalletAddress);
  console.log('Voter wallet:', voterWalletAddress);

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@blockvote.com', password: 'Admin@123' }),
  });

  const adminToken = adminLogin.token;

  const voterEmail = `ganachevoter${Date.now()}@mail.com`;
  const voterPassword = 'Voter@123';

  await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName: 'Ganache Voter', email: voterEmail, password: voterPassword }),
  });

  const voterLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: voterEmail, password: voterPassword }),
  });

  const voterToken = voterLogin.token;

  const candidate = await api('/admin/candidates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Ganache Candidate ${Date.now()}`,
      party: 'Independent',
    }),
  });

  const candidateId = candidate.candidate.id;
  console.log('Candidate id:', candidateId);

  const adminVoting = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, adminSigner);
  const voterVoting = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, voterSigner);

  try {
    const addTx = await adminVoting.addCandidate(candidateId, candidate.candidate.name, candidate.candidate.party);
    await addTx.wait();
  } catch (err) {
    if (!String(err.message).toLowerCase().includes('already')) {
      throw err;
    }
  }

  try {
    await api('/admin/election/start', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (err) {
    if (!String(err.message).toLowerCase().includes('already')) {
      throw err;
    }
  }

  try {
    const startTx = await adminVoting.startElection();
    await startTx.wait();
  } catch (err) {
    if (!String(err.message).toLowerCase().includes('already')) {
      throw err;
    }
  }

  const voteTx = await voterVoting.vote(candidateId);
  const voteReceipt = await voteTx.wait();
  console.log('On-chain vote tx:', voteReceipt.hash);

  await api('/voter/vote-record', {
    method: 'POST',
    headers: { Authorization: `Bearer ${voterToken}` },
    body: JSON.stringify({
      candidateId,
      txHash: voteReceipt.hash,
      walletAddress: voterWalletAddress,
    }),
  });

  let onChainDoubleVoteBlocked = false;
  try {
    const tx2 = await voterVoting.vote(candidateId);
    await tx2.wait();
  } catch (_err) {
    onChainDoubleVoteBlocked = true;
  }

  let backendDoubleVoteBlocked = false;
  try {
    await api('/voter/vote-record', {
      method: 'POST',
      headers: { Authorization: `Bearer ${voterToken}` },
      body: JSON.stringify({
        candidateId,
        txHash: `${voteReceipt.hash}dup`,
        walletAddress: voterWalletAddress,
      }),
    });
  } catch (_err) {
    backendDoubleVoteBlocked = true;
  }

  if (!onChainDoubleVoteBlocked) {
    throw new Error('Double voting was not blocked on-chain');
  }

  if (!backendDoubleVoteBlocked) {
    throw new Error('Double voting was not blocked in backend');
  }

  const me = await api('/voter/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${voterToken}` },
  });

  const candidates = await voterVoting.getAllCandidates();
  const votedCandidate = candidates.find((c) => Number(c.id) === Number(candidateId));

  console.log('Backend hasVoted:', me.user.hasVoted);
  console.log('On-chain voteCount for candidate:', Number(votedCandidate.voteCount));
  console.log('On-chain double vote blocked:', onChainDoubleVoteBlocked);
  console.log('Backend double vote blocked:', backendDoubleVoteBlocked);
  console.log('Ganache E2E vote flow test passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
