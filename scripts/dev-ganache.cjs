const { spawn } = require('child_process');

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForGanache(timeoutMs = 45000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isGanacheReady()) {
      return true;
    }

    await delay(1000);
  }

  return false;
}

async function startGanacheIfNeeded() {
  if (await isGanacheReady()) {
    log('SYSTEM', `Ganache already running at ${ganacheRpc}.\n`);
    return null;
  }

  log('SYSTEM', `Starting Ganache on ${ganacheRpc}...\n`);
  const ganache = runCommand(
    'GANACHE',
    `npx ganache --server.port ${ganachePort} --chain.chainId 1337 --wallet.totalAccounts 10`
  );

  const ready = await waitForGanache();
  if (!ready) {
    ganache.kill();
    throw new Error(`Ganache did not become ready at ${ganacheRpc}`);
  }

  log('SYSTEM', 'Ganache is ready.\n');
  return ganache;
}

async function runDeploy() {
  return new Promise((resolve, reject) => {
    const deploy = runCommand('DEPLOY', 'npm run new-cycle');

    deploy.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Ganache deployment failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  let ganache = null;

  try {
    ganache = await startGanacheIfNeeded();
  } catch (error) {
    log('SYSTEM', `${error.message}\n`);
    process.exit(1);
  }

  log('SYSTEM', 'Starting backend service...\n');
  const backend = runCommand('BACKEND', 'npm --prefix backend run dev');

  await delay(1800);

  log('SYSTEM', 'Starting frontend service...\n');
  const frontend = runCommand('FRONTEND', 'npm --prefix frontend run dev');

  await delay(3000);

  try {
    log('SYSTEM', 'Running new election cycle deployment...\n');
    await runDeploy();
    log('SYSTEM', 'New cycle deployment completed. App stack is ready.\n');
  } catch (error) {
    log('SYSTEM', `${error.message}\n`);
    log('SYSTEM', 'Keeping backend/frontend running so you can still use the app.\n');
  }

  const shutdown = () => {
    log('SYSTEM', 'Shutting down services...\n');
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
