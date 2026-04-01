import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { getClientIp, getClientPublicIp, getClientUserAgent } from '../utils/requestClient.js';
import {
  ensureRecognizerReady,
  findBestMatch,
  enrollSubjectFace,
  isFaceMatchForSubject,
  getSimilarityThreshold,
} from '../utils/compreface.js';

const router = express.Router();

const generateToken = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };

  if (user.role === 'admin') {
    payload.adminIp = user.adminIp || '';
    payload.adminUa = user.adminUa || '';
    payload.adminPublicIp = user.adminPublicIp || '';
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

const ensureAdminAccessLockTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_access_lock (
      id INT PRIMARY KEY,
      allowed_ip VARCHAR(64) NOT NULL,
      allowed_user_agent VARCHAR(300) NOT NULL,
      allowed_public_ip VARCHAR(64) NOT NULL DEFAULT '',
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await pool.query("ALTER TABLE admin_access_lock ADD COLUMN allowed_public_ip VARCHAR(64) NOT NULL DEFAULT ''");
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
};

const ensureFaceBiometricTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS face_biometrics (
      user_id INT PRIMARY KEY,
      persisted_face_id VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_face_biometrics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, faceImage } = req.body;

    if (!fullName || !email || !password || !faceImage) {
      return res.status(400).json({ message: 'fullName, email, password and faceImage are required' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await ensureFaceBiometricTable();
    await ensureRecognizerReady();

    const similarCandidate = await findBestMatch(faceImage);
    if (similarCandidate && similarCandidate.similarity >= getSimilarityThreshold()) {
      return res.status(409).json({
        message: 'A similar biometric identity already exists. Account creation denied.',
      });
    }

    let createdUserId = null;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [fullName, email, hashedPassword, 'voter']
      );
      createdUserId = result.insertId;

      const subjectId = `voter_${createdUserId}`;
      await enrollSubjectFace(subjectId, faceImage);

      await conn.query(
        'INSERT INTO face_biometrics (user_id, persisted_face_id) VALUES (?, ?)',
        [createdUserId, subjectId]
      );

      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    return res.status(201).json({
      message: 'User registered successfully',
      userId: createdUserId,
    });
  } catch (error) {
    if (error?.message?.includes('CompreFace is not configured')) {
      return res.status(503).json({ message: error.message });
    }

    if (error?.message?.includes('Captured image is too small')) {
      return res.status(400).json({ message: error.message });
    }

    if (error?.message?.includes('CompreFace recognize failed') || error?.message?.includes('CompreFace enroll failed')) {
      return res.status(400).json({
        message: 'Biometric processing failed. Capture a clear live face image with one visible face and try again.',
        error: error.message,
      });
    }

    return res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'voter') {
      return res.status(403).json({ message: 'Voter login requires biometric authentication.' });
    }

    const clientIp = getClientIp(req);
    const clientUserAgent = getClientUserAgent(req);
    const clientPublicIp = getClientPublicIp(req);

    if (user.role === 'admin') {
      if (!clientPublicIp) {
        return res.status(400).json({
          message: 'Public IP is required for admin login. Disable ad blockers/VPN shields and retry.',
        });
      }

      let lockRows = [];

      try {
        const [lock] = await pool.query(
          'SELECT allowed_ip, allowed_user_agent, allowed_public_ip FROM admin_access_lock WHERE id = 1'
        );
        lockRows = lock;
      } catch (tableError) {
        if (tableError?.code !== 'ER_NO_SUCH_TABLE' && tableError?.code !== 'ER_BAD_FIELD_ERROR') {
          throw tableError;
        }

        await ensureAdminAccessLockTable();
        const [lock] = await pool.query(
          'SELECT allowed_ip, allowed_user_agent, allowed_public_ip FROM admin_access_lock WHERE id = 1'
        );
        lockRows = lock;
      }

      if (lockRows.length === 0) {
        await pool.query(
          'INSERT INTO admin_access_lock (id, allowed_ip, allowed_user_agent, allowed_public_ip) VALUES (1, ?, ?, ?)',
          [clientIp, clientUserAgent, clientPublicIp]
        );
      } else {
        const allowedIp = lockRows[0].allowed_ip;
        const allowedUserAgent = lockRows[0].allowed_user_agent;
        const allowedPublicIp = lockRows[0].allowed_public_ip;

        if (allowedIp !== clientIp || allowedUserAgent !== clientUserAgent || allowedPublicIp !== clientPublicIp) {
          return res.status(403).json({ message: 'Admin login is restricted to the authorized IP/device only' });
        }
      }
    }

    const tokenPayload = {
      ...user,
      adminIp: clientIp,
      adminUa: clientUserAgent,
      adminPublicIp: clientPublicIp,
    };

    const token = generateToken(tokenPayload);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        hasVoted: Boolean(user.has_voted),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

router.post('/login/biometric-face', async (req, res) => {
  try {
    const { email, faceImage } = req.body;

    if (!email || !faceImage) {
      return res.status(400).json({ message: 'email and faceImage are required' });
    }

    await ensureFaceBiometricTable();

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    if (user.role !== 'voter') {
      return res.status(403).json({ message: 'Use admin login for admin accounts' });
    }

    const [bioRows] = await pool.query(
      'SELECT persisted_face_id FROM face_biometrics WHERE user_id = ? LIMIT 1',
      [user.id]
    );

    if (bioRows.length === 0) {
      return res.status(403).json({
        message: 'Biometric enrollment is missing for this account. Register again with biometric capture.',
      });
    }

    const matched = await isFaceMatchForSubject(faceImage, bioRows[0].persisted_face_id);
    if (!matched) {
      return res.status(401).json({ message: 'Biometric authentication failed' });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        hasVoted: Boolean(user.has_voted),
      },
    });
  } catch (error) {
    if (error?.message?.includes('CompreFace is not configured')) {
      return res.status(503).json({ message: error.message });
    }

    if (error?.message?.includes('Captured image is too small')) {
      return res.status(400).json({ message: error.message });
    }

    if (error?.message?.includes('CompreFace recognize failed')) {
      return res.status(400).json({
        message: 'Biometric verification failed. Capture a clear live face image with one visible face and try again.',
        error: error.message,
      });
    }

    return res.status(500).json({ message: 'Failed biometric login', error: error.message });
  }
});

export default router;
