/**
 * Heartwood - Main entry point
 */

import { createApp, startServer, setupFileProcessing } from './src/app.js';

async function start() {
  try {
    // Create and configure application
    const app = createApp();
    
    // Start the server
    const port = await startServer(app);
    
    // Setup file processing
    const watcher = setupFileProcessing();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      app.log.info('Shutting down server...');
      await watcher.close();
      await app.close();
      process.exit(0);
    });
    
    app.log.info(`Heartwood is ready! Server is listening on port ${port}`);
  } catch (err) {
    console.error('Failed to start Heartwood:', err);
    process.exit(1);
  }
}

// Start the application
start();
