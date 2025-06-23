/**
 * Core API routes
 */

import { createResponse, ensureTgdf } from '../utils/tgdf.js';
import { getAvailableScripts } from '../services/scriptService.js';
import { tgdf } from '../config/index.js';

/**
 * Register core API routes
 * @param {FastifyInstance} fastify - Fastify instance
 */
export default function registerCoreRoutes(fastify) {
  // Root API route - list all available endpoints
  fastify.get('/api', {
    schema: {
      tags: ['core'],
      summary: 'List all available API endpoints',
      description: 'Returns a list of all available API endpoints in the Heartwood system',
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            coreEndpoints: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  method: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            scriptEndpoints: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  method: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    handler: async (req, reply) => {
      try {
        // Get list of available scripts
        const scripts = await getAvailableScripts();
      
        // Build API routes list
        const routes = {
          coreEndpoints: [
            { path: '/api', method: 'GET', description: 'List all available API endpoints' },
            { path: '/api/status', method: 'GET', description: 'Get TGDF status information' },
            { path: '/api/convert', method: 'POST', description: 'Convert JSON to TGDF format' }
          ],          scriptEndpoints: [
            ...scripts.builtin.map(script => ([
              {
                path: `/api/${script}`,
                method: 'POST',
                description: `Execute builtin script: ${script} (POST with request body)`,
                infoPath: `/api/${script}/info`
              },
              {
                path: `/api/${script}`,
                method: 'GET',
                description: `Execute builtin script: ${script} (GET with query parameters)`,
                infoPath: `/api/${script}/info`
              }
            ])).flat(),
            ...scripts.custom.map(script => ([
              {
                path: `/api/${script}`,
                method: 'POST',
                description: `Execute custom script: ${script} (POST with request body)`,
                infoPath: `/api/${script}/info`
              },
              {
                path: `/api/${script}`,
                method: 'GET',
                description: `Execute custom script: ${script} (GET with query parameters)`,
                infoPath: `/api/${script}/info`
              }
            ])).flat()
          ]
        };
          // Always send the direct response for better compatibility
        reply.send(routes);
      } catch (err) {
        fastify.log.error(err);
          const errorMsg = {
          error: 'Failed to list API endpoints',
          details: err.message
        };
        
        reply.code(500).send(errorMsg);
      }
    }
  });

  // Status endpoint
  fastify.get('/api/status', {
    schema: {
      tags: ['core'],
      summary: 'Get TGDF status information',
      description: 'Returns the current status of the TGDF integration',
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            version: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    },
    handler: (req, reply) => {      const statusData = {
        enabled: true,
        version: tgdf.version,
        description: 'Tagged Data Format (TGDF) integration is active'
      };
      
      // Always send the direct response for better compatibility
      reply.send(statusData);
    }
  });
  // Convert to TGDF format
  fastify.post('/api/convert', {
    schema: {
      tags: ['core'],
      summary: 'Convert JSON to TGDF format',
      description: 'Converts the provided JSON data to Tagged Data Format (TGDF)',
      body: {
        type: 'object',
        additionalProperties: true
      },
      response: {
        200: {
          description: 'Successful conversion',
          type: 'object',
          additionalProperties: true
        },
        400: {
          description: 'Invalid request',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    },
    handler: (req, reply) => {      if (!req.body) {
        const errorMsg = { error: 'Missing request body' };
        reply.code(400).send(errorMsg);
        return;
      }
    
      try {
        const convertedData = ensureTgdf(req.body);
        
        const result = {
          originalData: req.body,
          convertedData: convertedData,
          message: 'Successfully converted to TGDF format'
        };
        
        // Always send direct response for better compatibility
        reply.send(result);
      } catch (e) {
        const errorMsg = { 
          error: 'Failed to convert to TGDF format', 
          details: e.message 
        };
        
        reply.code(500).send(errorMsg);
      }
    }
  });
}
