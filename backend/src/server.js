import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import voterRoutes from './routes/voterRoutes.js';
import { pool } from './config/db.js';
import {
  ensureContractAddressAvailable,
  getCurrentContractAddress,
  saveCurrentContractAddress,
} from './utils/contractAddressStore.js';

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = allowedOrigins.length > 0
  ? {
      origin(origin, callback) {
        // Allow server-to-server requests and health probes with no Origin header.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }
  : {
      origin: true,
      credentials: true,
    };

// Required when deployed behind a reverse proxy so req.ip reflects the real client address.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ message: 'BlockVote API is running' });
});

app.get('/api/config/contract-address', async (_req, res) => {
  const contractAddress = await ensureContractAddressAvailable();

  if (!contractAddress) {
    return res.status(404).json({ message: 'Contract address not available yet' });
  }

  return res.json({ contractAddress });
});

app.post('/api/config/contract-address/sync', async (req, res) => {
  const expectedSecret = process.env.CONTRACT_SYNC_SECRET;
  const providedSecret = req.headers['x-contract-sync-secret'];

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ message: 'Unauthorized contract sync request' });
  }

  const contractAddress = req.body?.contractAddress;
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress || '')) {
    return res.status(400).json({ message: 'Valid contractAddress is required' });
  }

  await saveCurrentContractAddress(contractAddress);
  return res.json({ message: 'Contract address synced', contractAddress });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voter', voterRoutes);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  const runtimeContractAddress = await getCurrentContractAddress();
  if (runtimeContractAddress) {
    console.log(`[CHAIN] Active contract address: ${runtimeContractAddress}`);
  } else {
    console.log('[CHAIN] Active contract address not set yet.');
  }

  // Test DB connection on startup so errors surface immediately in deploy logs.
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] Connected to database successfully.');
  } catch (err) {
    console.error('[DB] ❌ Database connection FAILED on startup:', err.code, err.message);
    console.error('[DB] Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL on Render.');
  }
});
