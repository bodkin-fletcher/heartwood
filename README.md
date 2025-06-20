# Heartwood

**Heartwood** is a Node.js backend application using Fastify and Yarn, configured with ECMAScript Modules (ESM) for a modern and simpler module system. It provides a JSON API with TGDF (Tagged Data Format) integration and processes JSON files from a specified directory.

## Features
- Fastify HTTP server serving a JSON API with TGDF formatting
- Modular, well-structured codebase following modern Node.js best practices
- OpenAPI/Swagger documentation available at /documentation
- Executes scripts from `builtin` and `custom` folders using ESM
- Watches the `in` folder for JSON files and processes them using the `default` script
- Saves processed results to the `out` folder with metadata
- Configured for offline use with Yarn's zero installs and PnP
- Automatic port selection if default port is in use
- Comprehensive test suite and CI integration

## Setup
1. Install Node.js 22.11.0 from [Node.js](https://nodejs.org/)
2. Install Yarn 4.5.2 by running `npm install -g yarn@4.5.2`
3. Clone the repository and navigate to the project directory
4. Run `yarn install` to install dependencies
5. Start the server with `yarn start`. The server will automatically find an available port starting from 3640

## Development
- Run the application in development mode with `yarn dev` (uses nodemon for hot reload)
- Run linting with `yarn lint`
- Run tests with `yarn test`
- Run tests with coverage report with `yarn test:coverage`

## API Usage
- **Root API**: `GET /api` - Lists all available API endpoints
- **Script Execution**: `POST /api/:scriptName` - Executes a script
- **Script Info**: `GET /api/:scriptName/info` - Shows script metadata
- **Request Body**: JSON with an `input` field, e.g., `{"input": {"key": "value"}}`
- **Response**: JSON result in TGDF format by default
- **Legacy Format**: Add `?tgdf=false` query parameter or `X-Use-TGDF: false` header for non-TGDF responses
- **API Documentation**: Browse interactive API docs at `/documentation`

## File Processing
- Place JSON files in the `in` folder
- The application processes them using the `default` script and saves results to the `out` folder
- Includes metadata to avoid re-processing the same file
- All results are in TGDF format by default

## Project Structure
- `src/` - Main source code
  - `config/` - Configuration files
  - `middleware/` - Fastify middleware
  - `routes/` - API routes
  - `services/` - Core services (file/script processing)
  - `utils/` - Utility functions
- `builtin/` - Built-in script modules
- `custom/` - Custom user script modules
- `in/` - Input directory for files to process
- `out/` - Output directory for processed files
- `__tests__/` - Test files

## Scripts
- Scripts in `builtin` and `custom` folders must export a default function
- The function takes an input object and options object and returns a result
- Scripts can optionally export an `info` object to provide metadata

## TGDF Integration
- **Tagged Data Format** (TGDF) is the default data representation format
- TGDF utility endpoints:
  - `/api/status` - Check TGDF support status
  - `/api/convert` - Convert regular JSON to TGDF format
- All API responses use TGDF format by default
- For legacy format, use:
  - `?tgdf=false` query parameter, or
  - `X-Use-TGDF: false` header
- The `src/utils/tgdf.js` module provides helper functions for TGDF conversion:
  - `toTgdf()` - Convert data to TGDF format
  - `fromTgdf()` - Extract data from TGDF format
  - `isTgdf()` - Check if data is in TGDF format
  - `ensureTgdf()` - Ensure data is in TGDF format
- See `custom/tgdf-example.js` for TGDF functionality examples

## Project Structure
```
heartwood/
├── builtin/          # Built-in script modules
├── custom/           # Custom script modules
├── in/               # Input directory for JSON files
├── out/              # Output directory for processed files
├── src/              # Source code
│   ├── config/       # Application configuration
│   ├── middleware/   # Fastify middleware
│   ├── routes/       # API route definitions
│   ├── services/     # Core business logic
│   └── utils/        # Utility functions
├── main.js           # Application entry point
├── nodemon.json      # Development server configuration
└── package.json      # Project metadata
```

## Offline Capability
- Uses Yarn's PnP and zero installs for offline dependency management
- Commit the `.yarn` folder and `.pnp.cjs` file to your repository