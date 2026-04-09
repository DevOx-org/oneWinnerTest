# BattleXGround — Production Deployment Guide

## Architecture Overview

```
                    ┌──────────────┐
                    │  Cloudflare  │  (CDN + DDoS + SSL)
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   NGINX      │  (reverse proxy + rate limit)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────┴───┐  ┌────┴───┐  ┌────┴───┐
         │ Node 1 │  │ Node 2 │  │ Node N │  (PM2 cluster)
         └────┬───┘  └────┬───┘  └────┬───┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
        ┌─────┴─────┐           ┌──────┴──────┐
        │  MongoDB   │          │   Redis     │
        │  Atlas     │           │   (Upstash) │
        └───────────┘           └────────────┘
```

---

## Redis Setup (Upstash)

BattleXGround uses Redis for two purposes:

1. **Distributed rate limiting** — shared state across multiple server instances
2. **Room credential caching** — prevents burst DB queries during match start

### Upstash (Recommended — Serverless, Free Tier)

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database (select region closest to your server)
3. Copy the `rediss://` connection URL
4. Set in your `.env`:
   ```
   REDIS_URL=rediss://default:your-password@your-host.upstash.io:6379
   ```

> **Important**: Use `rediss://` (double 's') for TLS connections. Upstash requires TLS.

### Graceful Fallback

If `REDIS_URL` is not set or Redis is unreachable:
- Rate limiting falls back to in-memory (MemoryStore) — functional but not distributed
- Room credential caching is disabled — every request hits MongoDB directly
- The server logs a warning but starts normally

---

## Running with PM2 (Horizontal Scaling)

PM2 cluster mode runs multiple Node.js worker processes on the same machine,
utilizing all CPU cores.

### Install PM2

```bash
npm install -g pm2
```

### ecosystem.config.js

```js
module.exports = {
  apps: [{
    name: 'bxg-api',
    script: 'src/server.js',
    instances: 'max',        // use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
    },
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
  }],
};
```

### Start in production

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # auto-start on reboot
```

> **Why PM2 + Redis?** Without Redis, each PM2 worker has its own in-memory rate limit store — a user could bypass rate limits by getting routed to different workers. Redis provides a single shared store.

---

## NGINX Setup

See `nginx.example.conf` in this repo for a production-ready template.

### Key features:
- **Connection limits**: max 50 concurrent connections per IP
- **Request rate limits**: 20 req/s general, 5 req/s auth (NGINX-level first line of defence)
- **Admin bypass**: no NGINX rate limits on `/api/admin`
- **Keepalive**: persistent connections to backend (reduces TCP overhead)
- **Gzip**: compresses JSON responses

### Install on Ubuntu

```bash
sudo apt install nginx
sudo cp nginx.example.conf /etc/nginx/sites-available/battlexground
sudo ln -s /etc/nginx/sites-available/battlexground /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Rate Limiting Strategy (3 Layers)

### Layer 1: NGINX (IP-based, fast rejection)
First line of defence — drops requests before they reach Node.js.

### Layer 2: Express Rate Limiting (User-based, Redis-backed)
Smarter limiting based on authenticated user ID (not just IP).

| Tier | Limit | Key | Purpose |
|------|-------|-----|---------|
| Auth | 20/15min | IP | Brute-force login protection |
| Public | 200/15min | IP | Leaderboard, tournament list |
| General | 300/15min | User ID/IP | Default for authenticated routes |
| Critical | 100/1min | User ID/IP | Room details (burst-tolerant) |
| Admin | No limit | — | Admin routes bypass limiting |

### Layer 3: Duplicate Request Guard (per-endpoint)
Prevents same user + same endpoint within 2-3 seconds. Blocks double-clicks and auto-retry loops.

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | Server port (default: 5001) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Strong random secret for JWT signing |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `FRONTEND_URL` | Primary frontend URL |

### Redis (Optional but recommended)

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection URL (use `rediss://` for TLS) |
| `ROOM_CACHE_TTL` | Room credential cache TTL in seconds (default: 300) |

### Rate Limiting (Optional overrides)

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window in ms |
| `RATE_LIMIT_AUTH_MAX` | 20 | Auth tier max requests |
| `RATE_LIMIT_PUBLIC_MAX` | 200 | Public tier max requests |
| `RATE_LIMIT_GENERAL_MAX` | 300 | General tier max requests |
| `RATE_LIMIT_CRITICAL_MAX` | 100 | Critical tier max requests |

---

## Frontend Recommendations

### Debounce Room Details Polling

When the match start window opens and users are polling for room credentials,
implement exponential backoff instead of fixed-interval polling:

```js
// React example — useEffect with exponential backoff
useEffect(() => {
  if (!roomVisible) {
    let delay = 3000; // start at 3s
    const poll = async () => {
      const data = await fetchRoomDetails(tournamentId);
      if (data.roomVisible) {
        setRoomData(data);
        return;
      }
      delay = Math.min(delay * 1.5, 15000); // max 15s
      timer = setTimeout(poll, delay);
    };
    let timer = setTimeout(poll, delay);
    return () => clearTimeout(timer);
  }
}, [roomVisible, tournamentId]);
```

### Disable Click After First Request

```js
const [loading, setLoading] = useState(false);

const handleGetRoom = async () => {
  if (loading) return;  // prevent double-clicks
  setLoading(true);
  try {
    const data = await fetchRoomDetails(tournamentId);
    setRoomData(data);
  } finally {
    setLoading(false);
  }
};
```

---

## Monitoring

### Health Check Endpoint

```
GET /api/health

Response:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-09T...",
  "redis": "connected"    ← shows Redis status
}
```

### Logs

| Log File | Content |
|----------|---------|
| `logs/combined-*.log` | All logs (JSON) |
| `logs/error-*.log` | Errors only |
| `logs/requests-*.log` | HTTP request/response logs |
| `logs/admin-*.log` | Admin action audit trail |

### Key Log Events to Monitor

- `Rate limit exceeded [tier]` — user hitting rate limits
- `Duplicate request blocked` — burst protection activated
- `Room credentials cache HIT/MISS` — cache effectiveness
- `Redis error` / `Redis reconnecting` — Redis health
- `Room details window open but credentials not set` — admin hasn't set creds yet

---

## Render Deployment

Your `render.yaml` is configured for Render. Key additions for production:

1. Add `REDIS_URL` environment variable in Render dashboard
2. Set `NODE_ENV=production`
3. Consider upgrading from free tier for better performance (free tier sleeps after inactivity)

### render.yaml (updated)

```yaml
services:
  - type: web
    name: battlexground-api
    runtime: node
    plan: starter  # upgrade from free for production
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5001
      - key: REDIS_URL
        sync: false  # set manually in dashboard (sensitive)
```
