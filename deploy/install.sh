#!/bin/bash
#
# Deployment script for 911 Dispatch Ingester
# Run this on your PostgreSQL server
#
# This script will:
# 1. Create the installation directory
# 2. Set up Python virtual environment
# 3. Copy the Python script
# 4. Install Python dependencies in venv
# 5. Set up a cron job to run every 5 minutes
# 6. Run an initial test
#

set -e

# Configuration
INSTALL_DIR="/opt/dispatch_ingester"
SCRIPT_NAME="dispatch_ingester.py"
LOG_DIR="/var/log/dispatch_ingester"
VENV_DIR="$INSTALL_DIR/venv"
CRON_SCHEDULE="*/5 * * * *"  # Every 5 minutes

echo "================================================"
echo "911 Dispatch Ingester - Deployment Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (sudo)"
    exit 1
fi

# Create installation directory
echo "[1/7] Creating installation directory..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"

# Copy the script (assumes script is in same directory as this deploy script)
echo "[2/7] Installing Python script..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/$SCRIPT_NAME" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/$SCRIPT_NAME"

# Ensure python3-venv is installed
echo "[3/7] Ensuring python3-venv is available..."
if ! python3 -m venv --help &> /dev/null; then
    apt-get update && apt-get install -y python3-venv python3-pip
fi

# Create virtual environment
echo "[4/7] Creating Python virtual environment..."
python3 -m venv "$VENV_DIR"

# Install Python dependencies in virtual environment
echo "[5/7] Installing Python dependencies in virtual environment..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install psycopg2-binary requests

# Create a wrapper script for cron
echo "[6/7] Creating cron wrapper script..."
cat > "$INSTALL_DIR/run_ingester.sh" << EOF
#!/bin/bash
# Wrapper script for cron execution
cd $INSTALL_DIR
$VENV_DIR/bin/python dispatch_ingester.py ingest >> $LOG_DIR/ingester.log 2>&1
EOF
chmod +x "$INSTALL_DIR/run_ingester.sh"

# Set up log rotation
echo "[7/7] Setting up log rotation and cron job..."
cat > /etc/logrotate.d/dispatch_ingester << EOF
/var/log/dispatch_ingester/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF

# Set up cron job
CRON_JOB="$CRON_SCHEDULE $INSTALL_DIR/run_ingester.sh"

# Remove existing cron job if present
crontab -l 2>/dev/null | grep -v "dispatch_ingester" | crontab - 2>/dev/null || true

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "================================================"
echo "Installation Complete!"
echo "================================================"
echo ""
echo "Installation directory: $INSTALL_DIR"
echo "Virtual environment: $VENV_DIR"
echo "Log directory: $LOG_DIR"
echo "Cron schedule: Every 5 minutes"
echo ""
echo "Running initial test..."
echo ""

# Run initial test using virtual environment
cd "$INSTALL_DIR"
"$VENV_DIR/bin/python" dispatch_ingester.py ingest

echo ""
echo "================================================"
echo "Setup successful! The ingester will now run"
echo "automatically every 5 minutes."
echo ""
echo "Useful commands:"
echo "  View logs:    tail -f $LOG_DIR/ingester.log"
echo "  Check stats:  $VENV_DIR/bin/python $INSTALL_DIR/dispatch_ingester.py stats"
echo "  Manual run:   $VENV_DIR/bin/python $INSTALL_DIR/dispatch_ingester.py ingest"
echo "  View cron:    crontab -l"
echo "================================================"
