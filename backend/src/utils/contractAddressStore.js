import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimePath = path.resolve(__dirname, '../../runtime/contract-address.json');

const isValidAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value || '');

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

export const getCurrentContractAddress = () => {
  const runtimeAddress = readRuntimeContractAddress();
  if (runtimeAddress) {
    return runtimeAddress;
  }

  const envAddress = process.env.VITE_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '';
  return isValidAddress(envAddress) ? envAddress : '';
};
