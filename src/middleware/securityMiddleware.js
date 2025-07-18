/**
 * Security middleware for Heartwood
 * Adds basic security headers and rate limiting
 */

import { server } from '../config/index.js';

/**
 * Simple in-memory request counter for rate limiting
 * In production, this should be replaced with Redis or similar
 */
const requestCounts = new Map();

/**
 * Middleware to add security headers to responses
 */
export function securityHeaders(req, reply, done) {
  // Add basic security headers
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  reply.header('Content-Security-Policy', "default-src 'self'");

  // Continue to next handler
  done();
}

/**
 * Rate limiting middleware
 * Limits requests per IP to help prevent abuse
 */
export function rateLimit(req, reply, done) {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = server.rateLimit?.windowMs || 60000; // 1 minute default
  const maxRequests = server.rateLimit?.max || 100; // 100 requests per minute default

  // Initialize or clean up old request count data
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 0, resetTime: now + windowMs });
  } else if (requestCounts.get(ip).resetTime <= now) {
    requestCounts.set(ip, { count: 0, resetTime: now + windowMs });
  }

  // Get current request count for IP
  const requestData = requestCounts.get(ip);
  requestData.count++;

  // Set headers to inform client about rate limits
  reply.header('X-RateLimit-Limit', maxRequests);
  reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - requestData.count));
  reply.header('X-RateLimit-Reset', Math.ceil(requestData.resetTime / 1000));

  // Check if rate limit exceeded
  if (requestData.count > maxRequests) {
    reply.code(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
    return;
  }

  // Continue to next handler
  done();
}

/**
 * API key validation middleware
 * For routes that require authentication
 */
export function validateApiKey(req, reply, done) {
  // Skip API key validation if not configured or if in development mode
  if (!server.apiKey || process.env.NODE_ENV === 'development') {
    done();
    return;
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey || providedKey !== server.apiKey) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }

  // Continue to next handler
  done();
}

/**
 * Register all security middleware
 * @param {FastifyInstance} fastify - Fastify instance
 */
export function registerSecurityMiddleware(fastify) {
  // Apply security headers to all routes
  fastify.addHook('onRequest', securityHeaders);

  // Apply rate limiting to all routes
  if (server.rateLimit?.enabled !== false) {
    fastify.addHook('onRequest', rateLimit);
  }

  // API key validation is applied selectively to routes that need it
}
