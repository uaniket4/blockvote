# BlockVote - Full Stack Decentralized Voting System

This project implements a decentralized voting system with:

- Frontend: React + Vite
- Backend: Node.js + Express
- Authentication: JWT
- Database: MySQL
- Blockchain: Ethereum (Solidity) + MetaMask + Ethers.js

Project structure:

- `frontend` - React UI with voter/admin pages and MetaMask integration
- `backend` - Express REST API with JWT auth and MySQL
- `contracts` - Solidity contract and Hardhat deployment scripts
- `database` - MySQL schema

## Features

- User registration and login (voter)
- Admin login
- JWT authentication and protected routes
- Admin panel to add candidates
- Admin can start and end election
- Voters can view candidates
- Voters can vote once
- Double voting prevention:
  - Smart contract (`hasVoted` mapping)
  - Backend (`users.has_voted` and unique vote record)
- Vote transaction stored on Ethereum blockchain
- MySQL stores users and candidate data

## Fast Run Commands (Recommended)

Use the root project commands to avoid switching folders repeatedly.

1. Install everything:
   ```bash
   npm run install:all
   ```
2. Start backend + frontend together:
   ```bash
   npm run dev
   ```
3. Start full local stack in one command (CompreFace + Ganache + backend + frontend):
   ```bash
   npm run dev:all
   ```
2. One command for full local stack with Ganache deploy sequence:
   ```bash
   npm run dev:ganache
   ```
3. Compile contracts:
   ```bash
   npm run contracts:compile
   ```
4. Deploy to Ganache:
   ```bash
   npm run contracts:deploy:ganache
   ```
5. Deploy fresh contract for a new election cycle:
   ```bash
   npm run new-cycle
   ```
6. Run Ganache end-to-end test:
   ```bash
   npm run contracts:test:e2e:ganache
   ```

Quick URLs after startup:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

Notes for the one-command flow:

- It automatically frees ports 5000, 5173, and 5174 first.
- Then it starts backend and frontend.
- Then it deploys the contract to Ganache.
- Keep Ganache desktop running before starting the command.

## Pages Included

- Login page
- Register page
- Voter dashboard
- Vote page
- Admin panel
- Results page

## 1) Database Setup

1. Start MySQL.
2. Create database/tables and seed admin:
   - Run [database/schema.sql](database/schema.sql)
3. Default admin credentials:
   - Email: `admin@blockvote.com`
   - Password: `Admin@123`

## 2) Backend Setup

1. Open terminal:
   ```bash
   cd backend
   npm install
   ```
2. Create env file:
   - Copy `.env.example` to `.env`
   - Fill values for MySQL and JWT secret
3. Start backend server:
   ```bash
   npm run dev
   ```
4. API base URL:
   - `http://localhost:5000/api`

## 3) Smart Contract Setup

1. Open terminal:
   ```bash
   cd contracts
   npm install
   ```
2. Compile contract:
   ```bash
   npm run compile
   ```
3. Run local blockchain (Hardhat):
   ```bash
   npm run node
   ```
4. In another terminal, deploy contract locally:
   ```bash
   cd contracts
   npm run deploy:local
   ```
5. Copy deployed contract address.

If deploying to Sepolia:

1. Copy `.env.example` to `.env` in [contracts](contracts)
2. Fill `SEPOLIA_RPC_URL` and `PRIVATE_KEY`
3. Deploy:
   ```bash
   npm run deploy:sepolia
   ```

## 4) Frontend Setup

1. Open terminal:
   ```bash
   cd frontend
   npm install
   ```
2. Create env file:
   - Copy `.env.example` to `.env`
   - Set:
     - `VITE_API_BASE_URL=http://localhost:5000/api`
     - `VITE_CONTRACT_ADDRESS=<deployed_contract_address>`
3. Start frontend:
   ```bash
   npm run dev
   ```

## MetaMask Integration

- Install MetaMask extension.
- Connect MetaMask to local Hardhat network or Sepolia.
- Import admin wallet used for contract deployment (owner) to perform admin blockchain actions.
- Voters connect wallets from Vote page during voting.

## No MetaMask Mode (Ganache Dev Wallet)

If MetaMask is not installed, you can still use the app in local development mode.

1. Open [frontend/.env](frontend/.env)
2. Add:
   - `VITE_GANACHE_RPC_URL=http://127.0.0.1:7545`
   - `VITE_DEV_PRIVATE_KEY=<one_ganache_private_key>`
3. Restart frontend (`npm --prefix frontend run dev` or `npm run dev:ganache`)

How it works:

- If MetaMask is present, the app uses MetaMask.
- If MetaMask is missing and `VITE_DEV_PRIVATE_KEY` is set, the app signs transactions directly against Ganache.
- Use this mode only for local development.

## Ganache Workflow

If you are using Ganache desktop instead of Hardhat local chain:

1. Start Ganache on http://127.0.0.1:7545
2. Deploy contract to Ganache:
   ```bash
   npm run contracts:deploy:ganache
   ```
3. Set frontend contract address in [frontend/.env](frontend/.env) from deployment output.
4. Connect MetaMask to Ganache network:
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
5. Import a Ganache account private key into MetaMask.

## REST API Routes

Auth routes:

- `POST /api/auth/register` - Register voter
- `POST /api/auth/login` - Login voter/admin

Admin routes (JWT + admin):

- `POST /api/admin/candidates` - Add candidate in MySQL
- `PUT /api/admin/election/start` - Start election in MySQL
- `PUT /api/admin/election/end` - End election in MySQL
- `GET /api/admin/results` - Candidate list for result metadata

Voter routes (JWT):

- `GET /api/voter/candidates` - View candidates
- `GET /api/voter/election-status` - Election status
- `GET /api/voter/me` - Current user profile
- `POST /api/voter/vote-record` - Save vote tx hash + mark voter as voted

## Solidity Contract

Main contract file:

- [contracts/Voting.sol](contracts/Voting.sol)

Core functions:

- `addCandidate(uint256 id, string name, string party)`
- `startElection()`
- `endElection()`
- `vote(uint256 candidateId)`
- `getAllCandidates()`
- `hasVoted(address)`

## Notes

- Candidate data source: MySQL
- Vote source of truth: Ethereum blockchain
- The frontend admin panel performs both DB and blockchain admin actions
- Voter submit flow:
  1. Cast vote on blockchain (MetaMask)
  2. Save transaction hash to backend/MySQL

