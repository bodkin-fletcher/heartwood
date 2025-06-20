/**
 * Script execution routes
 */

import { createResponse, fromTgdf, isTgdf } from '../utils/tgdf.js';
import { loadScript, executeScript } from '../services/scriptService.js';
import { validateInput, createValidationError } from '../utils/validation.js';

/**
 * Register script execution routes
 * @param {FastifyInstance} fastify - Fastify instance
 */
export default function registerScriptRoutes(fastify) {
  // Route for script execution
  fastify.post('/api/:scriptName', async (req, reply) => {
    const scriptName = req.params.scriptName;
    
    // Prevent path traversal
    if (scriptName.includes('/') || scriptName.includes('\\')) {
      reply.code(400).send(createResponse({
        error: 'Invalid script name: Path separators are not allowed'
      }, { type: 'error' }));
      return;
    }
    
    if (!('input' in req.body)) {
      reply.code(400).send(createResponse({
        error: 'Missing "input" in request body'
      }, { type: 'error' }));
      return;
    }
    
    // Handle TGDF input format
    let input = req.body.input;
    // Default to TGDF unless explicitly set to false
    const useTgdf = req.headers['x-use-tgdf'] !== 'false' && req.query.tgdf !== 'false';
    
    if (useTgdf && isTgdf(input)) {
      // Convert from TGDF format if needed
      input = fromTgdf(input);
    }
      const options = req.body.options || {}; // Default to empty object if not provided
    
    try {
      // Load script to get its info for validation
      const module = await loadScript(scriptName);
      
      // Validate input against script's schema
      if (module.info && module.info.input) {
        const validation = validateInput(input, module.info.input);
        if (!validation.isValid) {
          throw createValidationError(validation.errors);
        }
      }
      
      // Validate options against schema if available
      if (module.info && module.info.options && Object.keys(options).length > 0) {
        const optionsValidation = validateInput(options, { 
          type: 'object',
          properties: module.info.options 
        });
        if (!optionsValidation.isValid) {
          throw createValidationError(optionsValidation.errors.map(err => `Options: ${err}`));
        }
      }
      
      const result = await executeScript(scriptName, input, options);
      
      // Default to TGDF response format
      if (useTgdf) {
        reply.send(createResponse(result));
      } else {
        reply.send(result);
      }
    } catch (e) {
      const errorResponse = { 
        error: e.message.includes('not found') ? e.message : 'Script loading or execution failed', 
        details: e.message 
      };
      
      reply.code(e.message.includes('not found') ? 404 : 500)
           .send(createResponse(errorResponse, { type: 'error' }));
    }
  });

  // Route for script info
  fastify.get('/api/:scriptName/info', async (req, reply) => {
    const scriptName = req.params.scriptName;
    
    // Prevent path traversal
    if (scriptName.includes('/') || scriptName.includes('\\')) {
      reply.code(400).send(createResponse({
        error: 'Invalid script name: Path separators are not allowed'
      }, { type: 'error' }));
      return;
    }
    
    // Default to TGDF unless explicitly set to false
    const useTgdf = req.headers['x-use-tgdf'] !== 'false' && req.query.tgdf !== 'false';
    
    try {
      const module = await loadScript(scriptName);
      if (module.info) {
        if (useTgdf) {
          reply.send(createResponse(module.info, { type: 'script_info' }));
        } else {
          reply.send(module.info);
        }
      } else {
        const errorMsg = { error: `No info available for script "${scriptName}"` };
        reply.code(404).send(useTgdf 
          ? createResponse(errorMsg, { type: 'error' }) 
          : errorMsg);
      }
    } catch (e) {
      const errorResponse = { 
        error: e.message.includes('not found') ? e.message : 'Failed to load script info', 
        details: e.message 
      };
      
      reply.code(e.message.includes('not found') ? 404 : 500)
           .send(useTgdf 
             ? createResponse(errorResponse, { type: 'error' })
             : errorResponse);
    }
  });
}
