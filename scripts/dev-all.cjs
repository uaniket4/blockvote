const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const defaultCompreFaceDir = path.resolve(rootDir, '..', 'CompreFace');
const comprefaceDir = process.env.COMPRE_FACE_DIR || defaultCompreFaceDir;
const ganacheRpc = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
const ganachePort = Number(new URL(ganacheRpc).port || 7545);

function log(prefix, message) {
  process.stdout.write(`[${prefix}] ${message}`);
}

function runCommand(prefix, commandLine, options = {}) {
  const child = spawn(commandLine, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  child.stdout.on('data', (data) => log(prefix, data.toString()));
  child.stderr.on('data', (data) => log(prefix, data.toString()));
  child.on('error', (error) => log(prefix, `Process error: ${error.message}\n`));

  return child;
}

function runCommandSyncLike(prefix, commandLine, options = {}) {
  return new Promise((resolve, reject) => {
    const child = runCommand(prefix, commandLine, options);

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${commandLine} failed with exit code ${code}`));
      }
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, ms, timeoutMessage) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function isGanacheReady() {
  try {
    const response = await fetch(ganacheRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.json();
    return Boolean(body?.result);
  } catch {
    return false;
  }
}

async function waitForGanache(timeoutMs = 30000) {
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;
    if (await isGanacheReady()) {
      return true;
    }

    if (attempt % 5 === 0) {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      log('SYSTEM', `Waiting for Ganache at ${ganacheRpc} (${elapsed}s elapsed)...\n`);
    }

    await delay(1000);
  }

  return false;
}

async function startCompreFace() {
  log('SYSTEM', `Starting CompreFace from ${comprefaceDir}...\n`);

  try {
    // Fire and continue immediately so app boot is not blocked by Docker output latency.
    runCommand('COMPREFACE', 'docker compose up -d', { cwd: comprefaceDir });
    log('SYSTEM', 'CompreFace launch command sent. Continuing startup...\n');
  } catch (error) {
    log('SYSTEM', `CompreFace startup skipped/failed: ${error.message}\n`);
    log('SYSTEM', 'Continuing with local app stack.\n');
  }
}

async function cleanAppPorts() {
  log('SYSTEM', 'Freeing local app ports (5000, 5173, 5174) if occupied...\n');

  try {
    await runCommandSyncLike('PORTS', 'npx kill-port 5000 5173 5174', { cwd: rootDir });
    log('SYSTEM', 'Port cleanup complete.\n');
  } catch (error) {
    log('SYSTEM', `Port cleanup warning: ${error.message}\n`);
    log('SYSTEM', 'Continuing startup; existing processes may still be running.\n');
  }
}

async function startGanacheIfNeeded() {
  if (await isGanacheReady()) {
    log('SYSTEM', `Ganache already running at ${ganacheRpc}.\n`);
    return null;
  }

  log('SYSTEM', `Starting Ganache on port ${ganachePort}...\n`);
  const ganache = runCommand(
    'GANACHE',
    `npx ganache --server.port ${ganachePort} --chain.chainId 1337 --wallet.totalAccounts 10`,
    { cwd: rootDir }
  );

  const ready = await waitForGanache(45000);
  if (!ready) {
    ganache.kill();
    throw new Error(`Ganache did not become ready at ${ganacheRpc}`);
  }

  log('SYSTEM', 'Ganache is ready.\n');
  return ganache;
}

async function deployFreshContract() {
  log('SYSTEM', 'Deploying fresh contract (new election cycle)...\n');
  await runCommandSyncLike('DEPLOY', 'npm run new-cycle', { cwd: rootDir });
  log('SYSTEM', 'Contract deployed and frontend env updated.\n');
}

async function main() {
  await startCompreFace();
  await cleanAppPorts();
  log('SYSTEM', 'Checking Ganache RPC availability...\n');

  let ganache = null;
  try {
    ganache = await startGanacheIfNeeded();
  } catch (error) {
    log('SYSTEM', `${error.message}\n`);
    process.exit(1);
  }

  try {
    await deployFreshContract();
  } catch (error) {
    log('SYSTEM', `${error.message}\n`);
    if (ganache) {
      ganache.kill();
    }
    process.exit(1);
  }

  log('SYSTEM', 'Starting backend service...\n');
  const backend = runCommand('BACKEND', 'npm --prefix backend run dev', { cwd: rootDir });

  await delay(1200);

  log('SYSTEM', 'Starting frontend service...\n');
  const frontend = runCommand('FRONTEND', 'npm --prefix frontend run dev', { cwd: rootDir });

  const shutdown = () => {
    log('SYSTEM', 'Shutting down local services...\n');

    backend.kill();
    frontend.kill();

    if (ganache) {
      ganache.kill();
    }

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
