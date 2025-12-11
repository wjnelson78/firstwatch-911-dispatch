# 911 Dispatch Ingester - Server Deployment

This folder contains the files needed to deploy the 911 dispatch ingester on a PostgreSQL server.

**Author:** William Nelson  
**Created:** December 2025

## Files

- `dispatch_ingester.py` - Main Python script (uses environment variables for configuration)
- `install.sh` - Automated installation script

## Quick Deployment

1. **Copy files to the server:**

   ```bash
   scp -r deploy/ user@YOUR_SERVER_IP:/tmp/dispatch_ingester_deploy/
   ```

2. **SSH into the server:**

   ```bash
   ssh user@YOUR_SERVER_IP
   ```

3. **Run the installer:**

   ```bash
   cd /tmp/dispatch_ingester_deploy
   chmod +x install.sh
   sudo ./install.sh
   ```

## Manual Deployment (if needed)

If the automated script doesn't work, follow these steps:

1. **Install dependencies:**

   ```bash
   pip3 install psycopg2-binary requests
   ```

2. **Create installation directory:**

   ```bash
   mkdir -p /opt/dispatch_ingester
   mkdir -p /var/log/dispatch_ingester
   ```

3. **Copy script:**

   ```bash
   cp dispatch_ingester.py /opt/dispatch_ingester/
   chmod +x /opt/dispatch_ingester/dispatch_ingester.py
   ```

4. **Test the script:**

   ```bash
   cd /opt/dispatch_ingester
   python3 dispatch_ingester.py ingest
   ```

5. **Set up cron job (every 5 minutes):**

   ```bash
   crontab -e
   # Add this line:
   */5 * * * * /usr/bin/python3 /opt/dispatch_ingester/dispatch_ingester.py ingest >> /var/log/dispatch_ingester/ingester.log 2>&1
   ```

## Database Configuration

The script connects to PostgreSQL using environment variables or command-line arguments:

- **Host:** `DB_HOST` or `--host` (default: localhost)
- **Port:** `DB_PORT` or `--port` (default: 5432)
- **Database:** `DB_NAME` or `--database` (default: dispatch_911)
- **User:** `DB_USER` or `--user` (required)
- **Password:** `DB_PASSWORD` or `--password` (required)

### Setting Environment Variables

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=dispatch_911
export DB_USER=your_username
export DB_PASSWORD=your_secure_password
```

## Duplicate Prevention

The script prevents duplicates using:

- `event_id` column with `UNIQUE` constraint
- On duplicate: updates `last_seen` timestamp and `times_seen` counter
- Original data preserved in `first_seen` and `raw_data` columns

## Tables Created

1. **events** - Main event data (31 columns including raw JSON)
2. **ingestion_log** - Log of each ingestion run
3. **column_definitions** - API column mappings
4. **source_metadata** - API source information

## Monitoring Commands

```bash
# View live logs
tail -f /var/log/dispatch_ingester/ingester.log

# Check statistics
python3 /opt/dispatch_ingester/dispatch_ingester.py stats

# Manual ingestion
python3 /opt/dispatch_ingester/dispatch_ingester.py ingest

# Check cron status
crontab -l

# Query database directly
psql -U root -d dispatch_911 -c "SELECT COUNT(*) FROM events;"
psql -U root -d dispatch_911 -c "SELECT * FROM ingestion_log ORDER BY timestamp DESC LIMIT 10;"
```

## Data Collection Rate

- API provides ~1,700 events per request (48-hour window)
- Running every 5 minutes ensures no events are missed
- Expect ~500-1,000 new events per day depending on activity
