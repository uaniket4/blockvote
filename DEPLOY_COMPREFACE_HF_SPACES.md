# Deploy CompreFace Locally + Tunnel (No Cloud VM)

This is the most practical no-card setup for your current stack:
- Frontend: Vercel
- Backend: Render
- Biometric: CompreFace running on your local machine, exposed via tunnel

Your backend already supports this model through these env vars:
- COMPRE_FACE_BASE_URL
- COMPRE_FACE_API_KEY
- COMPRE_FACE_SIMILARITY_THRESHOLD

## 1) Run CompreFace locally with Docker

1. Install Docker Desktop and keep it running.
2. Clone CompreFace and start it:

```powershell
git clone https://github.com/exadel-inc/CompreFace.git
Set-Location CompreFace
docker compose up -d
```

3. Confirm CompreFace is up at:
- http://localhost:8000

If port 8000 is busy, free that port first or change CompreFace port mapping and use that same port in the next steps.

## 2) Create Recognition API key in CompreFace

1. Open CompreFace UI at http://localhost:8000.
2. Create an application.
3. Create a Face Recognition service.
4. Copy the generated API key.

Keep this key safe. It will be used by your Render backend as COMPRE_FACE_API_KEY.

## 3) Expose local CompreFace through a tunnel

Use either Cloudflare Tunnel or ngrok.

Option A: Cloudflare Tunnel (recommended for stable custom subdomain)

```powershell
# Example if cloudflared is already installed
cloudflared tunnel --url http://localhost:8000
```

Option B: ngrok (quick setup)

```powershell
ngrok http 8000
```

Copy the HTTPS forwarding URL, for example:
- https://abc123.ngrok-free.app

## 4) Point Render backend to tunneled CompreFace

In your Render backend service environment variables, set:

- COMPRE_FACE_BASE_URL = https://<your-tunnel-domain>
- COMPRE_FACE_API_KEY = <recognition-api-key-from-step-2>
- COMPRE_FACE_SIMILARITY_THRESHOLD = 0.8

Then redeploy backend.

Important: do not append endpoint paths in COMPRE_FACE_BASE_URL. Use only base origin.
Example:
- Correct: https://abc123.ngrok-free.app
- Wrong: https://abc123.ngrok-free.app/api/v1/recognition

## 5) Keep the tunnel online

This setup works only while your local CompreFace and tunnel are running.

Checklist while app is live:
- Docker Desktop running
- CompreFace containers healthy
- Tunnel process running
- Same tunnel URL still configured in Render

If tunnel URL rotates (common on free tiers), update COMPRE_FACE_BASE_URL in Render and redeploy.

## 6) Verify end-to-end from PowerShell

1. Backend health:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "https://<your-render-backend>/api/health"
```

2. Contract config endpoint:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "https://<your-render-backend>/api/config/contract-address"
```

3. Registration smoke test:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post -Uri "https://<your-render-backend>/api/auth/register" -ContentType "application/json" -Body '{"fullName":"test","email":"test@example.com","password":"test","faceImage":"data:image/jpeg;base64,AAAA"}'
```

Expected:
- You should not get the CompreFace-not-configured error once vars are correct.
- The tiny base64 sample can still fail with image-too-small, which is expected.

## 7) Security checklist

1. Keep COMPRE_FACE_API_KEY only in server-side env vars (never frontend).
2. Restrict tunnel access if your provider supports ACL/token rules.
3. Rotate JWT secret and other exposed secrets if previously shared.
4. Do not commit any real keys or tunnel tokens.

## 8) Operational limitations

Local + tunnel is a practical no-card path, but not fully production-grade:
- Depends on your machine uptime and internet stability.
- Free tunnel domains may rotate.
- Cold starts/restarts can break biometric flow until restarted.

For always-on production reliability, move CompreFace to a persistent host that supports multi-container deployment.
