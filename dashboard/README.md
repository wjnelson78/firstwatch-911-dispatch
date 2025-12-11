# 911 Dispatch Dashboard

A modern, real-time React dashboard for monitoring Snohomish County 911 dispatch events.

**Author:** William Nelson  
**Created:** December 2025  
**License:** MIT

## Features

- **Real-time Updates**: Auto-refresh every 30 seconds with live/pause toggle
- **Modern Dark Theme**: Glassmorphism design with animated gradient backgrounds
- **Granular Filtering**: Filter by agency type, jurisdiction, and call type
- **Searchable Dropdowns**: Quick lookup across 39 jurisdictions and 200+ call types
- **Interactive Charts**: Timeline, pie charts, and bar charts using Recharts
- **Event Details Modal**: Click any event for complete information with Google Maps
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Split/Unified View**: Toggle between combined or separated Police/Fire feeds

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **Recharts** for data visualization
- **Express** for the API server
- **PostgreSQL** for data storage

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database with dispatch data (see root README)

### Installation

```bash
# Install dependencies
npm install

# Start the API server (port 3002)
node server/index.js &

# Start the development server (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Preview the build
npm run preview
```

## Project Structure

```
dashboard/
├── server/
│   └── index.js          # Express API server
├── src/
│   ├── components/
│   │   ├── dashboard/    # Main dashboard components
│   │   │   ├── Dashboard.tsx       # Main container
│   │   │   ├── StatsCards.tsx      # Statistics cards
│   │   │   ├── Charts.tsx          # Data visualizations
│   │   │   └── EventDetailModal.tsx # Event detail popup
│   │   └── ui/           # shadcn/ui components
│   ├── services/
│   │   └── api.ts        # API client functions
│   ├── types/
│   │   └── dispatch.ts   # TypeScript interfaces
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── public/               # Static assets
└── index.html            # HTML template
```

## API Endpoints

The dashboard connects to a backend API server running on port 3002:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dispatches` | GET | Fetch dispatch events with filtering |
| `/api/stats` | GET | Get aggregate statistics |
| `/api/filters` | GET | Get available filter options |
| `/api/health` | GET | Health check |

## Configuration

### API Server

Edit `server/index.js` to configure:

- Database connection (host, port, database, user, password)
- CORS allowed origins
- Server port (default: 3002)

### Frontend

The API base URL is configured in `src/services/api.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

MIT License - see the LICENSE file for details.

## Author

**William Nelson** - December 2025
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
