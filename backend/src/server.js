import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import voterRoutes from './routes/voterRoutes.js';

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

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voter', voterRoutes);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
