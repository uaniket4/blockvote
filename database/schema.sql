CREATE DATABASE IF NOT EXISTS blockvote;
USE blockvote;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'voter') NOT NULL DEFAULT 'voter',
  has_voted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  party VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS election_status (
  id INT PRIMARY KEY,
  status ENUM('setup', 'active', 'ended') NOT NULL DEFAULT 'setup',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO election_status (id, status)
VALUES (1, 'setup')
ON DUPLICATE KEY UPDATE status = VALUES(status);

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
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  user_id INT PRIMARY KEY,
  credential_id VARCHAR(255) NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports VARCHAR(255) NULL,
  last_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_webauthn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  user_id INT PRIMARY KEY,
  current_challenge VARCHAR(255) NOT NULL,
  purpose ENUM('registration', 'authentication') NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_webauthn_challenge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS face_biometrics (
  user_id INT PRIMARY KEY,
  persisted_face_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_face_biometrics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_access_lock (
  id INT PRIMARY KEY,
  allowed_ip VARCHAR(64) NOT NULL,
  allowed_user_agent VARCHAR(300) NOT NULL,
  allowed_public_ip VARCHAR(64) NOT NULL DEFAULT '',
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_config (
  id INT PRIMARY KEY,
  contract_address VARCHAR(42) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed admin account
-- Email: admin@blockvote.com
-- Password: Admin@123
INSERT INTO users (full_name, email, password_hash, role, has_voted)
VALUES (
  'System Admin',
  'admin@blockvote.com',
  '$2a$10$b5zO7s3nSi9cedSLWL5eNeV4829DiGbyGath/IxecSDveIzOLSVbG',
  'admin',
  0
)
ON DUPLICATE KEY UPDATE role = 'admin';
