/**
 * Heartwood - Main application entry point
 */

import fastify from 'fastify';
import chokidar from 'chokidar';
import { server } from './config/index.js';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
import { tgdfMiddleware, errorHandler } from './middleware/tgdfMiddleware.js';
import registerCoreRoutes from './routes/coreRoutes.js';
import registerScriptRoutes from './routes/scriptRoutes.js';
import { setupFileWatcher } from './services/fileService.js';

/**
 * Create and configure the Fastify application
 * @returns {FastifyInstance} Configured Fastify instance
 */
export function createApp() {
  const app = fastify({ logger: server.logger });
  // Register Swagger/OpenAPI documentation
  app.register(import('@fastify/swagger'), swaggerOptions);
  app.register(import('@fastify/swagger-ui'), swaggerUiOptions);

  // Register middleware
  app.decorateRequest('useTgdf', true);
  app.addHook('onRequest', tgdfMiddleware());
  app.setErrorHandler(errorHandler);

  // Register routes
  registerCoreRoutes(app);
  registerScriptRoutes(app);

  return app;
}

/**
 * Start the application server
 * @param {FastifyInstance} app - Fastify instance
 * @returns {Promise<void>}
 */
export async function startServer(app) {
  // Try ports sequentially until one is available
  for (let attempt = 0; attempt < server.maxPortAttempts; attempt++) {
    const port = server.startPort + attempt;

    try {
      await app.listen({
        port,
        host: server.host
      });

      app.log.info(`Server listening on port ${port}`);
      app.log.info('TGDF integration enabled');
      return port; // Return the successful port
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        app.log.warn(`Port ${port} is in use, trying next port...`);
        // Continue to next iteration
      } else {
        // For other errors, log and throw
        app.log.error(err);
        throw new Error(`Failed to start server: ${err.message}`);
      }
    }
  }

  // If we get here, we couldn't find an available port
  app.log.error(`Could not find an available port after ${server.maxPortAttempts} attempts`);
  throw new Error(`Could not find an available port after ${server.maxPortAttempts} attempts`);
}

/**
 * Configure file watching for automatic processing
 */
export function setupFileProcessing() {
  const watcherConfig = setupFileWatcher();

  // Setup file watcher
  const watcher = chokidar.watch(watcherConfig.watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: true
  });

  // Configure event handlers
  watcher.on('add', (filePath) => {
    if (watcherConfig.fileFilter(filePath)) {
      watcherConfig.onFileAdded(filePath);
    }
  });

  watcher.on('change', (filePath) => {
    if (watcherConfig.fileFilter(filePath)) {
      watcherConfig.onFileChanged(filePath);
    }
  });

  return watcher;
}
