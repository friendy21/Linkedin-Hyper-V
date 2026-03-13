# Deployment Guide

---

## First-Time Deploy

### 1. Generate secrets

```bash
# AES-256-GCM key for session cookies (must be exactly 64 hex chars)
openssl rand -hex 32

# API shared secret (any long random string)
openssl rand -hex 24

# Redis password
openssl rand -hex 16
```

### 2. Create `.env` at the project root

```env
# Worker + Frontend shared
API_SECRET=<output of openssl rand -hex 24>
REDIS_PASSWORD=<output of openssl rand -hex 16>

# Worker only
SESSION_ENCRYPTION_KEY=<output of openssl rand -hex 32>
ACCOUNT_IDS=alice,bob

# Frontend only
API_URL=http://worker:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
PROXY_AUTH_TOKENS={"mytoken":"user","admintoken":"admin"}

# Optional proxy for Chrome
PROXY_URL=
```

### 3. Build and launch

```bash
docker-compose up -d --build
```

Docker will:
1. Start Redis and wait for it to pass its `redis-cli ping` healthcheck
2. Start the Worker and wait for it to pass its `GET /health` healthcheck
3. Then start the Frontend

---

## Startup Verification

```bash
# All three services should show "healthy"
docker-compose ps

# Worker should log "Worker API listening on port 3001"
docker-compose logs --tail=30 worker

# Frontend should show Next.js startup
docker-compose logs --tail=30 frontend
```

Send a test health request:

```bash
curl http://localhost:3001/health
# → {"status":"ok","ts":"2024-..."}
```

---

## Cookie Import

LinkedIn sessions are imported as raw cookie arrays. Get them from your browser's DevTools (Application → Cookies → linkedin.com). You need at minimum `li_at` and `JSESSIONID`.

```bash
export API_SECRET=your_api_secret_here

# Import cookies for account "alice"
curl -s -X POST http://localhost:3001/accounts/alice/session \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $API_SECRET" \
  -d '[
    {"name":"li_at","value":"AQE...","domain":".linkedin.com","path":"/","httpOnly":true,"secure":true,"sameSite":"None"},
    {"name":"JSESSIONID","value":"\"ajax:...\"","domain":".linkedin.com","path":"/","httpOnly":false,"secure":true,"sameSite":"None"}
  ]'

# Verify session is stored
curl -s http://localhost:3001/accounts/alice/session/status \
  -H "X-Api-Key: $API_SECRET"
# → {"exists":true,"accountId":"alice","savedAt":1234567890}
```

> **Tip:** Export all cookies from the browser using any "Copy as JSON" cookie export extension, then pipe the output directly to the curl command.

---

## Reverse Proxy Configuration (nginx)

```nginx
server {
    listen 443 ssl;
    server_name dashboard.example.com;

    ssl_certificate     /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# Never expose the worker API (port 3001) publicly
```

> **Important:** The worker API must NOT be exposed to the public internet. It is only accessible internally between containers via `http://worker:3001`.

---

## Updating

```bash
git pull origin main
docker-compose up -d --build
```

Containers will be rebuilt and restarted. Sessions and activity logs persist in Redis across restarts.

---

## Monitoring

```bash
# Follow all logs
docker-compose logs -f

# Worker only (actions, rate limits, errors)
docker-compose logs -f worker

# Check rate limit state for an account
docker exec -it $(docker-compose ps -q redis) \
  redis-cli -a $REDIS_PASSWORD keys "ratelimit:alice:*"

# Check activity log length
docker exec -it $(docker-compose ps -q redis) \
  redis-cli -a $REDIS_PASSWORD llen activity:log:alice
```

---

## Redis Backup / Restore

**Backup:**

```bash
docker exec $(docker-compose ps -q redis) redis-cli -a $REDIS_PASSWORD BGSAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis-backup.rdb
```

**Restore:**

```bash
docker-compose stop redis
docker cp ./redis-backup.rdb $(docker-compose ps -q redis):/data/dump.rdb
docker-compose start redis
```

---

## Production Checklist

- [ ] `SESSION_ENCRYPTION_KEY` is 64 hex chars (generated via `openssl rand -hex 32`)
- [ ] `API_SECRET` is strong and random (min 24 chars)
- [ ] `REDIS_PASSWORD` is set — Redis must never run unauthenticated
- [ ] Port `3001` is NOT exposed in `docker-compose.yml` (it isn't by default — keep it that way)
- [ ] `PROXY_URL` is configured if operating from a data centre IP
- [ ] `NODE_ENV=production` is set in the worker environment for sanitized error messages
- [ ] Nginx (or equivalent) sits in front of port `3000` with TLS
- [ ] Cookies are re-imported if LinkedIn session expires (every ~2 weeks)
- [ ] `shm_size: 1gb` is present on the worker service — do not remove it
