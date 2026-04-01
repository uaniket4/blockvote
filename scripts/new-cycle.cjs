const { spawnSync } = require('child_process');

function run(command) {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
      HARDHAT_DISABLE_SOLIDITY_SURVEY: 'true',
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('[NEW-CYCLE] Deploying fresh contract to Ganache...');
run('npm run contracts:deploy:ganache');

console.log('[NEW-CYCLE] Done. VITE_CONTRACT_ADDRESS has been auto-updated in frontend/.env.');
console.log('[NEW-CYCLE] Restart frontend (and backend if needed) to pick up the latest contract.');
