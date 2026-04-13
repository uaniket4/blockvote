import express from 'express';
import { pool } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { ensureCoreVotingTables } from '../utils/schemaBootstrap.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/candidates', async (_req, res) => {
  try {
    await ensureCoreVotingTables();
    const [candidates] = await pool.query(
      'SELECT id, name, party, is_active FROM candidates WHERE is_active = 1 ORDER BY id ASC'
    );
    return res.json({ candidates });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch candidates', error: error.message });
  }
});

router.get('/election-status', async (_req, res) => {
  try {
    await ensureCoreVotingTables();
    const [rows] = await pool.query('SELECT status FROM election_status WHERE id = 1');
    return res.json({ status: rows[0]?.status || 'setup' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get election status', error: error.message });
  }
});

router.post('/vote-record', async (req, res) => {
  let conn;

  try {
    const userId = req.user.id;
    const { candidateId, txHash, walletAddress } = req.body;

    if (!candidateId || !txHash || !walletAddress) {
      return res.status(400).json({ message: 'candidateId, txHash and walletAddress are required' });
    }

    const [statusRows] = await pool.query('SELECT status FROM election_status WHERE id = 1');
    const status = statusRows[0]?.status;
    if (status !== 'active') {
      return res.status(400).json({ message: 'Election is not active' });
    }

    conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [users] = await conn.query('SELECT has_voted FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (users.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: 'User not found' });
      }

      if (users[0].has_voted) {
        await conn.rollback();
        return res.status(409).json({ message: 'User has already voted' });
      }

      await conn.query(
        'INSERT INTO vote_records (user_id, candidate_id, tx_hash, wallet_address) VALUES (?, ?, ?, ?)',
        [userId, candidateId, txHash, walletAddress]
      );

      await conn.query('UPDATE users SET has_voted = 1 WHERE id = ?', [userId]);

      await conn.commit();
    } catch (txError) {
      if (conn) {
        await conn.rollback();
      }

      if (txError?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Vote already recorded for this user or wallet' });
      }

      throw txError;
    } finally {
      if (conn) {
        conn.release();
        conn = null;
      }
    }

    return res.status(201).json({ message: 'Vote recorded successfully' });
  } catch (error) {
    if (conn) {
      conn.release();
    }

    return res.status(500).json({ message: 'Failed to record vote', error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, has_voted FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: rows[0].id,
        fullName: rows[0].full_name,
        email: rows[0].email,
        role: rows[0].role,
        hasVoted: Boolean(rows[0].has_voted),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

export default router;
