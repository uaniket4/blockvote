import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const adminEmail = 'admin@blockvote.com';
const adminPassword = 'Admin@123';

try {
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const [updateResult] = await pool.query(
    "UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?",
    [passwordHash, adminEmail]
  );

  if (updateResult.affectedRows === 0) {
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, has_voted) VALUES (?, ?, ?, 'admin', 0)",
      ['System Admin', adminEmail, passwordHash]
    );
    console.log('admin-created');
  } else {
    console.log('admin-password-reset');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_access_lock (
      id INT PRIMARY KEY,
      allowed_ip VARCHAR(64) NOT NULL,
      allowed_user_agent VARCHAR(300) NOT NULL,
      allowed_public_ip VARCHAR(64) NOT NULL DEFAULT '',
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query('DELETE FROM admin_access_lock WHERE id = 1');
  console.log('admin-lock-reset');
} finally {
  await pool.end();
}
