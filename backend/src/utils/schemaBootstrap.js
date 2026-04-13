import { pool } from '../config/db.js';

export const ensureCoreVotingTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      party VARCHAR(120) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS election_status (
      id INT PRIMARY KEY,
      status ENUM('setup', 'active', 'ended') NOT NULL DEFAULT 'setup',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    "INSERT INTO election_status (id, status) VALUES (1, 'setup') ON DUPLICATE KEY UPDATE status = status"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vote_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      candidate_id INT NOT NULL,
      tx_hash VARCHAR(100) NOT NULL UNIQUE,
      wallet_address VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_vote_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      CONSTRAINT uq_user_vote UNIQUE (user_id),
      CONSTRAINT uq_wallet_vote UNIQUE (wallet_address)
    )
  `);
};
