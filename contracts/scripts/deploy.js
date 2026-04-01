const hre = require('hardhat');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

function normalizePrivateKey(value) {
  if (!value) {
    return null;
  }

  const stripped = value.startsWith('0x') ? value.slice(2) : value;
  if (/^[0-9a-fA-F]{64}$/.test(stripped)) {
    return `0x${stripped}`;
  }

  return null;
}

function upsertEnvValue(filePath, key, value) {
  const line = `${key}=${value}`;
  let content = '';

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content = `${content.trimEnd()}\n${line}\n`;
    }
  } else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    content = `${line}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

async function main() {
  let signer;

  if (hre.network.name === 'ganache') {
    const rpcUrl = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ganachePk = normalizePrivateKey(process.env.GANACHE_PRIVATE_KEY);

    signer = ganachePk ? new ethers.Wallet(ganachePk, provider) : await provider.getSigner(0);
  }

  const Voting = await hre.ethers.getContractFactory('Voting', signer);
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log('Voting contract deployed to:', address);

  const frontendEnvPath = path.resolve(__dirname, '../../frontend/.env');
  upsertEnvValue(frontendEnvPath, 'VITE_CONTRACT_ADDRESS', address);
  console.log('Updated frontend env at:', frontendEnvPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
