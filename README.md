# Snohomish County 911 Dispatch Monitor

A comprehensive real-time 911 dispatch monitoring system for Snohomish County, WA. This project includes a Python data ingester and a modern React dashboard for visualizing emergency dispatch events.

**Author:** William Nelson  
**Created:** December 2025  
**License:** MIT

![Dashboard Preview](dashboard/public/preview.png)

## 🚀 Features

### Data Ingestion (Python)
- **Real-time Data Fetching**: Retrieves 911 dispatch events from the FirstWatch API
- **PostgreSQL Storage**: Enterprise-grade data storage with connection pooling
- **Smart Deduplication**: Tracks events by unique ID to prevent duplicates
- **Scheduled Execution**: Runs via cron job every 5 minutes
- **Full Event History**: Maintains historical record beyond the API's 48-hour window

### Web Dashboard (React + TypeScript)
- **Modern Dark Theme**: Glassmorphism design with animated backgrounds
- **Real-time Updates**: Auto-refresh every 30 seconds with live/pause toggle
- **Granular Filtering**: Filter by agency type, jurisdiction, and call type
- **Searchable Dropdowns**: Quick lookup across 39 jurisdictions and 200+ call types
- **Interactive Charts**: Timeline, pie charts, and bar charts using Recharts
- **Event Details Modal**: Click any event for complete information with Google Maps
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 📦 Project Structure

```
firstwach.net/
├── dispatch_ingester.py      # Python ingester script
├── requirements.txt          # Python dependencies
├── README.md                 # This file
├── dashboard/                # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   └── dashboard/    # Dashboard-specific components
│   │   ├── services/         # API client functions
│   │   ├── types/            # TypeScript interfaces
│   │   └── lib/              # Utility functions
│   └── server/               # Express API backend
│       └── index.js          # REST API server
└── deploy/                   # Server deployment files
    └── install.sh            # Installation script
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL 14+

### Database Setup

1. Create the PostgreSQL database:
```sql
CREATE DATABASE dispatch_911;
CREATE USER dispatch_api WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dispatch_911 TO dispatch_api;
```

2. The ingester will automatically create the required tables on first run.

### Python Ingester Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
export DISPATCH_DB_HOST=localhost
export DISPATCH_DB_NAME=dispatch_911
export DISPATCH_DB_USER=dispatch_api
export DISPATCH_DB_PASS=your_secure_password

# Run a single ingestion
python dispatch_ingester.py ingest

# Set up cron job for automatic updates (every 5 minutes)
crontab -e
# Add: */5 * * * * cd /opt/dispatch_ingester && /usr/bin/python3 dispatch_ingester.py >> /var/log/dispatch_ingester.log 2>&1
```

### Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Start the API server (port 3002)
node server/index.js &

# Start the development server (port 5173)
npm run dev
```

Access the dashboard at `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISPATCH_DB_HOST` | PostgreSQL host | `localhost` |
| `DISPATCH_DB_PORT` | PostgreSQL port | `5432` |
| `DISPATCH_DB_NAME` | Database name | `dispatch_911` |
| `DISPATCH_DB_USER` | Database user | `dispatch_api` |
| `DISPATCH_DB_PASS` | Database password | Required |

### API Server Configuration

The Express server runs on port 3002 by default. Edit `dashboard/server/index.js` to change:
- Database connection settings
- CORS allowed origins
- API port number

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dispatches` | GET | Fetch dispatch events with pagination and filtering |
| `/api/stats` | GET | Get aggregate statistics and charts data |
| `/api/filters` | GET | Get available filter options with counts |
| `/api/health` | GET | Health check endpoint |

### Query Parameters for `/api/dispatches`

- `limit` - Number of events to return (default: 100)
- `offset` - Pagination offset
- `agency` - Filter by agency type (Police/Fire)
- `jurisdiction` - Filter by jurisdiction name
- `call_type` - Filter by call type
- `search` - Full-text search

## 🗄️ Database Schema

### dispatch_events Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-increment primary key |
| event_id | VARCHAR | Unique event identifier from API |
| call_number | VARCHAR | Call number assigned |
| address | TEXT | Location address |
| call_type | VARCHAR | Type of call (911, COLLISION, etc.) |
| units | TEXT | Responding units |
| call_created | TIMESTAMP | When the call was created |
| jurisdiction | VARCHAR | Responding agency name |
| agency_type | VARCHAR | Police or Fire |
| longitude | DECIMAL | GPS longitude coordinate |
| latitude | DECIMAL | GPS latitude coordinate |
| first_seen | TIMESTAMP | When event was first ingested |
| last_seen | TIMESTAMP | When event was last seen in API |
| raw_data | JSONB | Original JSON data from API |

## 📈 Data Source

Data is sourced from the Snohomish County 911 public event listing via FirstWatch:

- **API Endpoint**: `https://subscriber.firstwatch.net/publiceventlisting/EventListing`
- **Coverage**: Last 48 hours of events
- **Delay**: Law enforcement events delayed 30 minutes
- **Limitations**: Some sensitive incidents are excluded

## 🖼️ Screenshots

### Main Dashboard
- Dark theme with animated gradient background
- Real-time event feed with agency type indicators
- Statistics cards showing key metrics

### Event Detail Modal
- Complete event information
- Google Maps integration for location
- Responding units and timestamps

### Analytics View
- Activity timeline chart
- Agency distribution pie chart
- Top jurisdictions bar chart

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**William Nelson**
- Created: December 2025
- Repository: [github.com/wnelson/firstwach.net](https://github.com/wnelson/firstwach.net)

## 🙏 Acknowledgments

- Snohomish County 911 for providing public data access
- FirstWatch for the API infrastructure
- shadcn/ui for the beautiful component library
- Recharts for the charting library
