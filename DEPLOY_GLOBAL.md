# Global Deployment Guide (BlockVote)

This guide publishes BlockVote globally using:
- Backend API: Render (Web Service)
- Frontend: Vercel (Static React app)
- Database: Any managed MySQL provider (Railway/Aiven/PlanetScale/MySQL cloud VM)
- Blockchain: Sepolia (recommended for public testing)

## 1) Prepare Environment Variables

### Backend env (Render)
Use values from [backend/.env.example](backend/.env.example):

- `PORT=5000`
- `HOST=0.0.0.0`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `TRUST_PROXY=true`
- `CORS_ORIGIN=https://<your-frontend-domain>`

If you use both Vercel preview and production domains, add both comma-separated:
- `CORS_ORIGIN=https://<your-app>.vercel.app,https://<your-custom-domain>`

### Frontend env (Vercel)
Use values from [frontend/.env.example](frontend/.env.example):

- `VITE_API_BASE_URL=https://<your-backend-domain>/api`
- `VITE_CONTRACT_ADDRESS=<deployed-contract-address>`

## 2) Deploy Smart Contract to Sepolia

1. In [contracts/.env.example](contracts/.env.example), create `.env` and set:
   - `SEPOLIA_RPC_URL`
   - `PRIVATE_KEY`
2. Run:
   ```bash
   npm --prefix contracts install
   npm --prefix contracts run deploy:sepolia
   ```
3. Copy deployed contract address into frontend env as `VITE_CONTRACT_ADDRESS`.

## 3) Deploy Backend on Render

1. Create new Web Service from your repository.
2. Root directory: `backend`
3. Build command:
   ```bash
   npm install
   ```
4. Start command:
   ```bash
   npm run start
   ```
5. Add backend env vars listed above.
6. Confirm health endpoint:
   - `https://<backend-domain>/api/health`

## 4) Deploy Frontend on Vercel

1. Import repo to Vercel.
2. Project root: `frontend`
3. Build command:
   ```bash
   npm run build
   ```
4. Output directory: `dist`
5. Add frontend env vars listed above.
6. Ensure SPA rewrites are active via [frontend/vercel.json](frontend/vercel.json).

## 5) Database Setup (Managed MySQL)

1. Provision a MySQL database.
2. Run [database/schema.sql](database/schema.sql) against it.
3. Set backend DB env vars to the managed DB credentials.

## 6) Domain and HTTPS

1. Add custom domains in Render and Vercel.
2. Update `CORS_ORIGIN` to your final frontend domain(s).
3. Redeploy backend after CORS update.

## 7) Post-deploy Verification

- Frontend loads globally over HTTPS.
- Backend health endpoint returns JSON.
- Register/login works.
- Admin can add candidates/start election.
- Wallet connects with MetaMask on Sepolia.
- Voting transaction succeeds and backend vote record is stored.

## Notes

- Do not expose `VITE_DEV_PRIVATE_KEY` in production.
- For public users, MetaMask should be the signer path.
- Keep `JWT_SECRET` long and random.
