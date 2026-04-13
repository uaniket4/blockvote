import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimePath = path.resolve(__dirname, '../../runtime/contract-address.json');

const isValidAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value || '');

export const ensureContractConfigTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_config (
      id INT PRIMARY KEY,
      contract_address VARCHAR(42) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

export const saveCurrentContractAddress = async (address) => {
  if (!isValidAddress(address)) {
    return;
  }

  await ensureContractConfigTable();
  await pool.query(
    'INSERT INTO contract_config (id, contract_address) VALUES (1, ?) ON DUPLICATE KEY UPDATE contract_address = VALUES(contract_address)',
    [address]
  );
};

const readContractAddressFromDb = async () => {
  try {
    await ensureContractConfigTable();
    const [rows] = await pool.query('SELECT contract_address FROM contract_config WHERE id = 1 LIMIT 1');
    const address = rows[0]?.contract_address || '';
    return isValidAddress(address) ? address : '';
  } catch (_error) {
    return '';
  }
};

export const readRuntimeContractAddress = () => {
  try {
    if (!fs.existsSync(runtimePath)) {
      return '';
    }

    const raw = fs.readFileSync(runtimePath, 'utf8');
    const parsed = JSON.parse(raw);
    const address = parsed?.contractAddress || '';

    return isValidAddress(address) ? address : '';
  } catch (_error) {
    return '';
  }
};

export const getCurrentContractAddress = async () => {
  const dbAddress = await readContractAddressFromDb();
  if (dbAddress) {
    return dbAddress;
  }

  const runtimeAddress = readRuntimeContractAddress();
  if (runtimeAddress) {
    return runtimeAddress;
  }

  const envAddress = process.env.VITE_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '';
  return isValidAddress(envAddress) ? envAddress : '';
};
