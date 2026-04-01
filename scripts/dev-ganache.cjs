const { spawn } = require('child_process');

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
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
