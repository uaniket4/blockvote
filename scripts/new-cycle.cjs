const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
  const result = spawnSync(command, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
      HARDHAT_DISABLE_SOLIDITY_SURVEY: 'true',
    },
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function readLatestContractAddress() {
  const runtimePath = path.resolve(__dirname, '../backend/runtime/contract-address.json');
  if (!fs.existsSync(runtimePath)) {
    return '';
  }

  try {
    const raw = fs.readFileSync(runtimePath, 'utf8');
    const parsed = JSON.parse(raw);
    const value = parsed?.contractAddress || '';
    return /^0x[a-fA-F0-9]{40}$/.test(value) ? value : '';
  } catch (_error) {
    return '';
  }
}

async function syncRemoteContractAddress(contractAddress) {
  const backendBaseUrl = process.env.CONTRACT_SYNC_BACKEND_URL;
  const syncSecret = process.env.CONTRACT_SYNC_SECRET;

  if (!backendBaseUrl || !syncSecret) {
    console.log('[NEW-CYCLE] Remote sync skipped (set CONTRACT_SYNC_BACKEND_URL and CONTRACT_SYNC_SECRET to enable).');
    return;
  }

  try {
    const base = backendBaseUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/api/config/contract-address/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-contract-sync-secret': syncSecret,
      },
      body: JSON.stringify({ contractAddress }),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    console.log(`[NEW-CYCLE] Remote backend contract sync succeeded at ${base}.`);
  } catch (error) {
    console.error('[NEW-CYCLE] Remote backend contract sync failed:', error.message);
  }
}

async function main() {
  console.log('[NEW-CYCLE] Deploying fresh contract to Ganache...');
  run('npm run contracts:deploy:ganache');

  const contractAddress = readLatestContractAddress();
  if (contractAddress) {
    await syncRemoteContractAddress(contractAddress);
  } else {
    console.log('[NEW-CYCLE] Local deploy finished, but no contract address file found for remote sync.');
  }

  console.log('[NEW-CYCLE] Done. VITE_CONTRACT_ADDRESS has been auto-updated in frontend/.env.');
  console.log('[NEW-CYCLE] Restart frontend (and backend if needed) to pick up the latest contract.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
