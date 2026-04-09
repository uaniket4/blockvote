import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const shouldUseSsl = process.env.DB_SSL === 'true';
const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: shouldUseSsl ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
