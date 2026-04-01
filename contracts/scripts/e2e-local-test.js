const { ethers } = require('hardhat');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';
const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS ||
  process.env.GANACHE_CONTRACT_ADDRESS ||
  '0x0E4d0d1aB6DE4ea57255Cf2B4d26d71120C9CCd5';

async function api(path, options = {}) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_e) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  let adminSigner;
  let voterSigner;

  const signers = await ethers.getSigners();
  if (signers.length >= 2) {
    [adminSigner, voterSigner] = signers;
  } else {
    adminSigner = await ethers.provider.getSigner(0);
    voterSigner = await ethers.provider.getSigner(1);
  }

  const adminWalletAddress = await adminSigner.getAddress();
  const voterWalletAddress = await voterSigner.getAddress();

  console.log('Admin wallet:', adminWalletAddress);
  console.log('Voter wallet:', voterWalletAddress);

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@blockvote.com',
      password: 'Admin@123',
    }),
  });

  const adminToken = adminLogin.token;

  const voterEmail = `voter${Date.now()}@mail.com`;
  const voterPassword = 'Voter@123';

  await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Local Voter',
      email: voterEmail,
      password: voterPassword,
    }),
  });

  const voterLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: voterEmail,
      password: voterPassword,
    }),
  });

  const voterToken = voterLogin.token;

  const candidate = await api('/admin/candidates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Candidate ${Date.now()}`,
      party: 'Independent',
    }),
  });

  const candidateId = candidate.candidate.id;
  console.log('Candidate id:', candidateId);

  const adminVoting = await ethers.getContractAt('Voting', CONTRACT_ADDRESS, adminSigner);

  try {
    const addTx = await adminVoting.addCandidate(candidateId, candidate.candidate.name, candidate.candidate.party);
    await addTx.wait();
  } catch (e) {
    if (!String(e.message).toLowerCase().includes('already')) {
      throw e;
    }
  }

  try {
    await api('/admin/election/start', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (e) {
    if (!String(e.message).includes('already')) {
      throw e;
    }
  }

  try {
    const startTx = await adminVoting.startElection();
    await startTx.wait();
  } catch (e) {
    if (!String(e.message).toLowerCase().includes('already')) {
      throw e;
    }
  }

  const voting = await ethers.getContractAt('Voting', CONTRACT_ADDRESS, voterSigner);
  const tx = await voting.vote(candidateId);
  const receipt = await tx.wait();
  console.log('On-chain vote tx:', receipt.hash);

  await api('/voter/vote-record', {
    method: 'POST',
    headers: { Authorization: `Bearer ${voterToken}` },
    body: JSON.stringify({
      candidateId,
      txHash: receipt.hash,
      walletAddress: voterWalletAddress,
    }),
  });

  const me = await api('/voter/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${voterToken}` },
  });

  const candidates = await voting.getAllCandidates();
  const votedCandidate = candidates.find((c) => Number(c.id) === Number(candidateId));

  let onChainDoubleVoteBlocked = false;
  try {
    const tx2 = await voting.vote(candidateId);
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
        txHash: `${receipt.hash}-dup`,
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

  console.log('Backend hasVoted:', me.user.hasVoted);
  console.log('On-chain voteCount for candidate:', Number(votedCandidate.voteCount));
  console.log('On-chain double vote blocked:', onChainDoubleVoteBlocked);
  console.log('Backend double vote blocked:', backendDoubleVoteBlocked);
  console.log('E2E local vote flow test passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
