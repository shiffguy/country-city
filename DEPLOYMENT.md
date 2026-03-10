# Cloud Deployment Guide

## Option 1: Railway (Recommended — Easiest)

Railway handles PostgreSQL, Redis, and your server all in one place.

### Steps:
1. Create account at [railway.app](https://railway.app)
2. Create a new project
3. Add **PostgreSQL** service (click "+ New" → "Database" → "PostgreSQL")
4. Add **Redis** service (click "+ New" → "Database" → "Redis")
5. Add your **Server** service (click "+ New" → "GitHub Repo" → select this repo)
6. Configure the server service:
   - **Root Directory**: `/` (root, since Dockerfile handles paths)
   - **Dockerfile Path**: `apps/server/Dockerfile`
   - Add environment variables:
     - `DATABASE_URL` — copy from PostgreSQL service
     - `REDIS_URL` — copy from Redis service
     - `JWT_SECRET` — generate a random secret (e.g., `openssl rand -hex 32`)
     - `PORT` — `3000`
7. Deploy! Railway will build and run your Docker container.
8. Copy the public URL (e.g., `https://country-city-server.up.railway.app`)
9. Update `apps/mobile/constants/config.ts` with this URL

### Cost: ~$5-10/month for hobby use

---

## Option 2: Render

### Steps:
1. Create account at [render.com](https://render.com)
2. Create a **PostgreSQL** database (free tier available)
3. Create a **Redis** instance
4. Create a **Web Service**:
   - Connect your GitHub repo
   - **Docker** build
   - **Dockerfile Path**: `apps/server/Dockerfile`
   - Add environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET, PORT)
5. Deploy
6. Copy the service URL and update mobile config

### Cost: Free tier available (with limitations)

---

## Option 3: Fly.io

### Steps:
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
cd apps/server
fly launch --dockerfile Dockerfile

# Create PostgreSQL
fly postgres create --name country-city-db
fly postgres attach country-city-db

# Create Redis (Upstash)
fly redis create --name country-city-redis

# Set secrets
fly secrets set JWT_SECRET=$(openssl rand -hex 32)

# Deploy
fly deploy
```

### Cost: Free tier includes 3 shared VMs

---

## Option 4: Docker Compose on a VPS

For full control, rent a VPS (DigitalOcean, Hetzner, Linode) and run docker-compose.

### Steps:
1. Rent a VPS ($5-10/month)
2. SSH into the server
3. Install Docker and Docker Compose
4. Clone the repo
5. Create `.env` file:
```bash
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-secret-key
```
6. Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```
7. Set up a domain with SSL (use Caddy or nginx as reverse proxy)

---

## Mobile App Configuration

After deploying the server, update the production URL in:
`apps/mobile/constants/config.ts`

```typescript
const PRODUCTION_SERVER_URL = 'https://your-actual-server-url.com';
```

## EAS Build (Publishing the Mobile App)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure
cd apps/mobile
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```
