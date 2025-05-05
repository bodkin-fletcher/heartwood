# Heartwood

**Heartwood** is a Node.js backend application using Fastify and Yarn, configured with ECMAScript Modules (ESM) for a modern and simpler module system. It provides a JSON API and processes JSON files from a specified directory.

## Features
- Fastify HTTP server serving a JSON API.
- Executes scripts from `builtin` and `custom` folders using ESM.
- Watches the `in` folder for JSON files and processes them using the `default` script.
- Saves processed results to the `out` folder with metadata.
- Configured for offline use with Yarn's zero installs and PnP.

## Setup
1. Install Node.js 22.11.0 from [Node.js](https://nodejs.org/).
2. Install Yarn 4.5.2 by running `npm install -g yarn@4.5.2`.
3. Clone the repository and navigate to the project directory.
4. Run `yarn install` to install dependencies.
5. Start the server with `yarn start`.

## API Usage
- **Endpoint**: `POST /api/:scriptName`
- **Request Body**: JSON with an `input` field, e.g., `{"input": {"key": "value"}}`
- **Response**: JSON result from the script execution.

## File Processing
- Place JSON files in the `in` folder.
- The application processes them using the `default` script and saves results to the `out` folder.
- Includes metadata to avoid re-processing the same file.

## Scripts
- Scripts in `builtin` and `custom` folders must export a single function using `export default`.
- The function takes an input object and returns a result object.

## Offline Capability
- Uses Yarn's PnP and zero installs for offline dependency management.
- Commit the `.yarn` folder and `.pnp.cjs` file to your repository.