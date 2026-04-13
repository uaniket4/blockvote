const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const syncEnvPath = path.resolve(__dirname, '../.env.sync');

function parseEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function main() {
  let syncEnv = {};

  if (fs.existsSync(syncEnvPath)) {
    syncEnv = parseEnvFile(syncEnvPath);
    console.log(`[NEW-CYCLE:CLOUD] Loaded sync configuration from ${syncEnvPath}`);
  } else {
    console.log('[NEW-CYCLE:CLOUD] .env.sync not found. Running with current environment only.');
  }

  const result = spawnSync('node scripts/new-cycle.cjs', {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...syncEnv,
    },
  });

  process.exit(result.status || 0);
}

main();
