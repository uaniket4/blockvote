# Deploy CompreFace on Hugging Face Spaces (No Card Flow)

This guide connects your current stack:
- Frontend: Vercel
- Backend: Render
- Biometric: CompreFace on Hugging Face Spaces (Docker)

## 1) Create Hugging Face Space

1. Sign in to Hugging Face.
2. Create new Space.
3. Choose:
   - SDK: Docker
   - Visibility: Private (recommended for biometric service)
   - Hardware: CPU Basic (free tier)
4. Create the Space.

## 2) Add Docker files in the Space repository

Use the CompreFace docker compose stack as base.

Important practical note:
- CompreFace is a multi-container service (UI, API, admin, core, postgres).
- Hugging Face Spaces is best suited for single-container apps.
- For easiest success on Spaces free tier, expose only the CompreFace API path your backend needs.

If full CompreFace stack is required, prefer a provider that supports multi-container compose natively.

## 3) Preferred no-card production fallback

If full CompreFace on Spaces is unstable, use this no-card fallback:
1. Keep backend on Render.
2. Run CompreFace locally.
3. Expose local CompreFace through a stable tunnel provider.
4. Point Render backend COMPRE_FACE_BASE_URL to tunnel URL.

## 4) Configure Render backend environment

In Render backend service, set:

- COMPRE_FACE_BASE_URL = https://<your-space-or-tunnel-url>
- COMPRE_FACE_API_KEY = <recognition-model-api-key>
- COMPRE_FACE_SIMILARITY_THRESHOLD = 0.8

Already existing in your backend flow:
- Contract sync secret and cloud sync support
- Admin lock reset endpoint with secret header

After env update, redeploy backend.

## 5) Verify from terminal

Run from local PowerShell:

1. Health check:
Invoke-WebRequest -UseBasicParsing -Uri "https://blockvote-sw2r.onrender.com/api/health"

2. Contract address endpoint:
Invoke-WebRequest -UseBasicParsing -Uri "https://blockvote-sw2r.onrender.com/api/config/contract-address"

3. Register smoke check:
Invoke-WebRequest -UseBasicParsing -Method Post -Uri "https://blockvote-sw2r.onrender.com/api/auth/register" -ContentType "application/json" -Body '{"fullName":"test","email":"test@example.com","password":"test","faceImage":"data:image/jpeg;base64,AAAA"}'

Expected:
- If CompreFace is reachable: not configured/unavailable error should disappear.
- Tiny image test may still return image-too-small, which is normal.

## 6) Security checklist

1. Rotate CONTRACT_SYNC_SECRET (the old value was exposed in chat).
2. Keep Space private when possible.
3. Restrict who can access CompreFace endpoint.
4. Never commit real keys to git.

## 7) If you want true always-on free cloud

No-card + always-on + multi-container is difficult.
Most reliable free setup usually needs one of:
- Verified cloud VM (often asks card)
- Paid low-cost VPS

For strict no-card, expect occasional cold starts or limitations.
