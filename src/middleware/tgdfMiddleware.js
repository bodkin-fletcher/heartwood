/**
 * TGDF middleware for request and response handling
 */

import { fromTgdf, createResponse } from '../utils/tgdf.js';

/**
 * Creates middleware that handles TGDF format standardization
 * @returns {Function} Fastify middleware function
 */
export function tgdfMiddleware() {
  return function(req, reply, done) {
    // Set a flag for whether TGDF should be used (default true)
    req.useTgdf = req.headers['x-use-tgdf'] !== 'false' && req.query.tgdf !== 'false';
    
    // Add helper method to send TGDF responses
    reply.sendTgdf = function(data, options = {}) {
      return reply.send(createResponse(data, options));
    };
    
    done();
  };
}

/**
 * Error handler for standardized TGDF error responses
 * @param {Error} error - The error that occurred
 * @param {FastifyRequest} request - The request object
 * @param {FastifyReply} reply - The reply object
 */
export function errorHandler(error, request, reply) {
  // Extract error details
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    error: error.message,
    statusCode,
    ...(error.validation ? { validation: error.validation } : {})
  };

  // Always send errors in TGDF format unless explicitly disabled
  if (request.useTgdf !== false) {
    reply.code(statusCode).send(createResponse(errorResponse, { type: 'error' }));
  } else {
    reply.code(statusCode).send(errorResponse);
  }
}
