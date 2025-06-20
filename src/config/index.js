/**
 * Application configuration
 */

import path from 'path';

// Base paths
const basePath = process.cwd();

// Directory paths
export const directories = {
  builtin: path.join(basePath, 'builtin'),
  custom: path.join(basePath, 'custom'),
  input: path.join(basePath, 'in'),
  output: path.join(basePath, 'out')
};

// Server configuration
export const server = {
  startPort: 3640,
  maxPortAttempts: 10, // Try ports from 3640 to 3649
  host: '0.0.0.0', // Bind to all interfaces
  logger: true
};

// TGDF configuration
export const tgdf = {
  version: 'v0.1.0',
  defaultEnabled: true
};
