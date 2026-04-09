const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/run-hardhat.cjs <hardhat-args...>');
  process.exit(1);
}

const hardhatCli = require.resolve('hardhat/internal/cli/cli.js');

const result = spawnSync(process.execPath, [hardhatCli, ...args], {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
    HARDHAT_DISABLE_TELEMETRY: 'true',
    HARDHAT_DISABLE_SOLIDITY_SURVEY: 'true',
  },
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
