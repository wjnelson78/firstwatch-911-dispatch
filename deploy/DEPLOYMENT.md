# Production Deployment Guide

## Server Information

| Component | Value |
|-----------|-------|
| **Production Server** | 172.16.32.201 |
| **SSH User** | root |
| **SSH Password** | NEL2233obs |
| **Database Server** | 172.16.32.253:5432 |
| **Database Name** | dispatch_911 |
| **Database User** | dispatch_api |
| **Database Password** | nYV7I1Hb64wpWKpkO6chCONs |
| **Public URL** | https://www.snocodispatch.com |

## Directory Structure (CRITICAL!)

```
/opt/firstwatch-911-dispatch/          <-- CORRECT PATH (not /var/www/snocodispatch!)
├── dashboard/
│   ├── dist/                          <-- Built frontend (nginx serves this)
│   ├── server/
│   │   └── index.js                   <-- API server (PM2 runs this)
│   ├── src/                           <-- React source code
│   ├── .env                           <-- Production environment variables
│   └── package.json
├── deploy/
├── dispatch_ingester.py
└── README.md
```

## Services

### PM2 (Node.js API Server)

The API runs on port 3002 managed by PM2.

```bash
# Check status
pm2 status

# View logs
pm2 logs dispatch-api --lines 50

# Restart API
pm2 restart dispatch-api

# If PM2 is pointing to wrong directory, fix it:
pm2 delete dispatch-api
cd /opt/firstwatch-911-dispatch/dashboard
pm2 start server/index.js --name dispatch-api
pm2 save
```

### Nginx (Web Server)

Nginx serves the static frontend and proxies API requests.

- **Config location**: `/etc/nginx/sites-enabled/snocodispatch`
- **Frontend root**: `/opt/firstwatch-911-dispatch/dashboard/dist`
- **API proxy**: `/api/` → `http://127.0.0.1:3002/api/`

```bash
# Test config
nginx -t

# Reload nginx
systemctl reload nginx

# Check status
systemctl status nginx
```

### Cloudflare

The domain uses Cloudflare for DNS and SSL termination.
- Cloudflare handles HTTPS → connects to origin server via HTTP
- No SSL certificates needed on the origin server
- DNS: snocodispatch.com and www.snocodispatch.com point through Cloudflare

## Environment Variables

Production `.env` at `/opt/firstwatch-911-dispatch/dashboard/.env`:

```env
DATABASE_URL=postgresql://dispatch_api:nYV7I1Hb64wpWKpkO6chCONs@172.16.32.253:5432/dispatch_911
VITE_API_URL=/api
JWT_SECRET=<generated-secret>
CORS_ORIGIN=https://www.snocodispatch.com
```

**IMPORTANT**: `VITE_API_URL=/api` (relative URL, no host - Cloudflare handles routing)

## Deployment Steps

### Quick Deploy (after git push)

```bash
# SSH to production
sshpass -p 'NEL2233obs' ssh root@172.16.32.201

# On server:
cd /opt/firstwatch-911-dispatch
git pull
cd dashboard
npm run build
pm2 restart dispatch-api
```

### Full Deployment Script

```bash
#!/bin/bash
# Run from local machine

SERVER="root@172.16.32.201"
PASS="NEL2233obs"
APP_DIR="/opt/firstwatch-911-dispatch"

# Push to GitHub first
git add -A && git commit -m "Deploy update" && git push origin main

# Deploy to server
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER "
  cd $APP_DIR && \
  git pull && \
  cd dashboard && \
  npm install && \
  npm run build && \
  pm2 restart dispatch-api
"

echo "Deployment complete!"
```

## Troubleshooting

### API returning 404

1. Check PM2 is running from correct directory:
   ```bash
   pm2 show dispatch-api | grep "exec cwd"
   # Should show: /opt/firstwatch-911-dispatch/dashboard
   ```

2. If wrong directory, fix PM2:
   ```bash
   pm2 delete dispatch-api
   lsof -ti:3002 | xargs kill -9 2>/dev/null
   cd /opt/firstwatch-911-dispatch/dashboard
   pm2 start server/index.js --name dispatch-api
   pm2 save
   ```

### Double /api/api/ in URLs

- Check `VITE_API_URL` in `.env` - should be `/api` (not `http://localhost:3002/api`)
- Frontend code should NOT append `/api` if `API_BASE` already includes it
- Rebuild frontend after changing `.env`: `npm run build`

### Port 3002 already in use

```bash
lsof -ti:3002 | xargs kill -9
pm2 restart dispatch-api
```

### Nginx won't start

```bash
nginx -t  # Check for config errors
# Common issues:
# - SSL cert paths that don't exist (Cloudflare handles SSL, not needed)
# - Wrong root directory path
```

### Frontend shows old version

```bash
cd /opt/firstwatch-911-dispatch/dashboard
npm run build
# Clear browser cache or hard refresh (Ctrl+Shift+R)
```

## Nginx Configuration

Current working config at `/etc/nginx/sites-enabled/snocodispatch`:

```nginx
server {
    listen 80;
    server_name snocodispatch.com www.snocodispatch.com;

    root /opt/firstwatch-911-dispatch/dashboard/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Common Mistakes to Avoid

1. ❌ **DO NOT** run PM2 from `/var/www/snocodispatch` - that's the OLD path
2. ❌ **DO NOT** set `VITE_API_URL` to full URL with host - use relative `/api`
3. ❌ **DO NOT** configure SSL certs in nginx - Cloudflare handles SSL
4. ❌ **DO NOT** forget to rebuild frontend after changing `.env`
5. ❌ **DO NOT** forget to `pm2 save` after fixing PM2 config

## Verification Commands

```bash
# Test API locally on server
curl -s http://localhost:3002/api/dispatches?limit=1

# Test API through Cloudflare
curl -s https://www.snocodispatch.com/api/dispatches?limit=1

# Test heartbeat
curl -s -X POST https://www.snocodispatch.com/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test"}'

# Check PM2 process
pm2 show dispatch-api

# Check nginx
systemctl status nginx
```
