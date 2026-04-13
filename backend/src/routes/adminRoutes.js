import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { pool } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { saveCurrentContractAddress } from '../utils/contractAddressStore.js';

const router = express.Router();
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../..');

const getOrCreateCampaignId = async (adminUserId) => {
  try {
    const [campaignRows] = await pool.query('SELECT id FROM campaigns ORDER BY id ASC LIMIT 1');

    if (campaignRows.length > 0) {
      return Number(campaignRows[0].id);
    }

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const [insertResult] = await pool.query(
      'INSERT INTO campaigns (title, description, status, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'Default Election Campaign',
        'Auto-created by BlockVote admin route for candidate registration',
        'pending',
        now,
        sevenDaysLater,
        adminUserId,
      ]
    );

    return Number(insertResult.insertId);
  } catch (error) {
    // campaigns table may not exist in older schema; caller should fallback to legacy insert.
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return null;
    }

    throw error;
  }
};

router.use(authenticateJWT, requireAdmin);

router.post('/candidates', async (req, res) => {
  try {
    const { name, party } = req.body;

    if (!name || !party) {
      return res.status(400).json({ message: 'Candidate name and party are required' });
    }

    let result;

    try {
      const campaignId = await getOrCreateCampaignId(req.user.id);

      if (campaignId) {
        [result] = await pool.query(
          'INSERT INTO candidates (campaign_id, name, party) VALUES (?, ?, ?)',
          [campaignId, name, party]
        );
      } else {
        [result] = await pool.query(
          'INSERT INTO candidates (name, party) VALUES (?, ?)',
          [name, party]
        );
      }
    } catch (insertError) {
      if (insertError?.code !== 'ER_BAD_FIELD_ERROR') {
        throw insertError;
      }

      // Legacy schema without campaign_id column.
      [result] = await pool.query(
        'INSERT INTO candidates (name, party) VALUES (?, ?)',
        [name, party]
      );
    }

    return res.status(201).json({
      message: 'Candidate added',
      candidate: {
        id: result.insertId,
        name,
        party,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add candidate', error: error.message });
  }
});

router.delete('/candidates/:id', async (req, res) => {
  try {
    const candidateId = Number(req.params.id);

    if (!Number.isInteger(candidateId) || candidateId <= 0) {
      return res.status(400).json({ message: 'Valid candidate id is required' });
    }

    const [statusRows] = await pool.query('SELECT status FROM election_status WHERE id = 1');
    if (statusRows[0]?.status === 'active') {
      return res.status(400).json({ message: 'Cannot delete candidate while election is active' });
    }

    const [result] = await pool.query(
      'UPDATE candidates SET is_active = 0 WHERE id = ? AND is_active = 1',
      [candidateId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Candidate not found or already deleted' });
    }

    return res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete candidate', error: error.message });
  }
});

router.put('/election/start', async (_req, res) => {
  try {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.query('UPDATE election_status SET status = ? WHERE id = 1', ['active']);
      await conn.query('UPDATE users SET has_voted = 0 WHERE role = ?', ['voter']);
      await conn.query('DELETE FROM vote_records');

      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    return res.json({ message: 'Election started and voter eligibility reset' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to start election', error: error.message });
  }
});

router.put('/election/end', async (_req, res) => {
  try {
    await pool.query('UPDATE election_status SET status = ? WHERE id = 1', ['ended']);
    return res.json({ message: 'Election ended' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to end election', error: error.message });
  }
});

router.post('/election/new-cycle', async (_req, res) => {
  try {
    const { stdout, stderr } = await execAsync('npm run new-cycle', {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
        HARDHAT_DISABLE_SOLIDITY_SURVEY: 'true',
      },
    });

    const output = `${stdout}\n${stderr}`;
    const match = output.match(/Voting contract deployed to:\s*(0x[a-fA-F0-9]{40})/);

    if (!match) {
      return res.status(500).json({
        message: 'New cycle deployed but contract address could not be parsed',
      });
    }

    await saveCurrentContractAddress(match[1]);

    return res.json({
      message: 'New cycle contract deployed',
      contractAddress: match[1],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to deploy new cycle contract',
      error: error.message,
    });
  }
});

router.get('/results', async (_req, res) => {
  try {
    const [candidates] = await pool.query('SELECT id, name, party FROM candidates ORDER BY id ASC');
    return res.json({ candidates });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch results candidates', error: error.message });
  }
});

export default router;
