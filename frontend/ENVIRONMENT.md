# Environment Configuration Guide

This document explains how to configure and use different environments for the OTW frontend application.

## Environment Files

The application uses different environment files for different deployment scenarios:

### 1. `.env` - Base Development Environment
```bash
# Local Development Environment
VITE_API_BASE_URL=http://localhost:5001
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAH8081SHaUSXwnvIVOoEC4dCGhftZrfGg
VITE_SOCKET_URL=http://localhost:5001
VITE_NODE_ENV=development
```

### 2. `.env.local` - Local Development Override
```bash
# Local Development Environment (overrides .env)
VITE_API_BASE_URL=http://localhost:5001
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAH8081SHaUSXwnvIVOoEC4dCGhftZrfGg
VITE_SOCKET_URL=http://localhost:5001
VITE_NODE_ENV=development
```

### 3. `.env.production` - Production Environment
```bash
# Production Environment
VITE_API_BASE_URL=https://omwhub.com
VITE_API_URL=https://omwhub.com/api
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAH8081SHaUSXwnvIVOoEC4dCGhftZrfGg
VITE_SOCKET_URL=https://omwhub.com
VITE_NODE_ENV=production
```

## Environment Variable Naming Convention

All environment variables must be prefixed with `VITE_` to be accessible in the frontend application.

- `VITE_API_BASE_URL` - Base URL of the backend server
- `VITE_API_URL` - Full API URL with `/api` path
- `VITE_SOCKET_URL` - WebSocket server URL
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `VITE_NODE_ENV` - Environment mode (development/production)

## Build Scripts

The package.json includes environment-specific build scripts:

### Development Scripts
```bash
npm run dev              # Development mode with .env
npm run dev:local        # Local mode with .env.local
npm run build:dev        # Build for development
npm run build:local      # Build for local testing
```

### Production Scripts
```bash
npm run build            # Production build with .env.production
npm run preview:prod     # Preview production build
```

## Environment Loading Priority

Vite loads environment files in the following order (higher priority overrides lower):

1. `.env.production` (production mode)
2. `.env.local` (always loaded, except in test mode)
3. `.env.development` (development mode)
4. `.env` (always loaded)

## Usage in Code

### Import from centralized config:
```javascript
import { API_URL, SOCKET_URL, config } from '../config';

// Use individual exports
const response = await fetch(`${API_URL}/users`);

// Or use the config object
const socket = io(config.socket.url, config.socket.options);
```

### Direct environment variable access:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
const isProduction = import.meta.env.MODE === 'production';
```

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

The build process will automatically use the appropriate environment file based on the mode specified.

## Security Notes

- Never commit actual API keys or sensitive data to version control
- Use placeholder values in committed environment files
- Set actual values in your deployment environment
- The `.env.local` file is ignored by git for local overrides

## Troubleshooting

### Environment variables not loading:
1. Ensure variables are prefixed with `VITE_`
2. Check file naming (`.env.production`, not `.env.prod`)
3. Restart the development server after changes
4. Verify the correct mode is being used

### Build issues:
1. Check that all required environment variables are set
2. Ensure the correct environment file exists for the build mode
3. Verify URLs are accessible and correctly formatted

## File Structure
```
frontend/
├── .env                    # Base development environment
├── .env.local             # Local development overrides (gitignored)
├── .env.production        # Production environment
├── src/
│   └── app/
│       └── config.js      # Centralized environment config
└── vite.config.js         # Vite configuration with environment handling
```
