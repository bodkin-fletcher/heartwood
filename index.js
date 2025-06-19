import fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import { pathToFileURL } from 'url';
import { ensureTgdf, fromTgdf, createResponse, isTgdf } from './utils/tgdf.js';

const app = fastify({ logger: true });
const builtinDir = path.join(process.cwd(), 'builtin');
const customDir = path.join(process.cwd(), 'custom');
const inDir = path.join(process.cwd(), 'in');
const outDir = path.join(process.cwd(), 'out');

// Ensure directories exist
[builtinDir, customDir, inDir, outDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Script cache to avoid reloading scripts multiple times
const scriptCache = new Map();

/**
 * Load a script module from custom or builtin directories.
 * @param {string} scriptName - The name of the script without .js extension.
 * @returns {object} The exported module from the script.
 * @throws {Error} If the script cannot be found or loaded.
 */
async function loadScript(scriptName) {
  if (scriptCache.has(scriptName)) {
    return scriptCache.get(scriptName);
  }
  const customPath = path.join(customDir, `${scriptName}.js`);
  const builtinPath = path.join(builtinDir, `${scriptName}.js`);
  
  if (fs.existsSync(customPath)) {
    try {
      const module = await import(pathToFileURL(customPath).href);
      scriptCache.set(scriptName, module);
      return module;
    } catch (e) {
      throw new Error(`Failed to load script from custom directory (${customPath}): ${e.message}`);
    }
  } else if (fs.existsSync(builtinPath)) {
    try {
      const module = await import(pathToFileURL(builtinPath).href);
      scriptCache.set(scriptName, module);
      return module;
    } catch (e) {
      throw new Error(`Failed to load script from builtin directory (${builtinPath}): ${e.message}`);
    }
  } else {
    throw new Error(`Script "${scriptName}" not found. Looked in:
- Custom directory: ${customPath}
- Builtin directory: ${builtinPath}`);
  }
}

// Root API route - list all available endpoints
app.get('/api', async (req, reply) => {
  try {
    // Get list of builtin scripts
    let builtinScripts = [];
    try {
      const builtinFiles = await fs.promises.readdir(builtinDir);
      builtinScripts = builtinFiles
        .filter(file => file.endsWith('.js'))
        .map(file => file.slice(0, -3)); // Remove .js extension
    } catch (err) {
      app.log.error('Failed to read builtin directory:', err);
    }
    
    // Get list of custom scripts
    let customScripts = [];
    try {
      const customFiles = await fs.promises.readdir(customDir);
      customScripts = customFiles
        .filter(file => file.endsWith('.js'))
        .map(file => file.slice(0, -3)); // Remove .js extension
    } catch (err) {
      app.log.error('Failed to read custom directory:', err);
    }
    
    // Build API routes list
    const routes = {
      coreEndpoints: [
        { path: '/api', method: 'GET', description: 'List all available API endpoints' },
        { path: '/api/status', method: 'GET', description: 'Get TGDF status information' },
        { path: '/api/convert', method: 'POST', description: 'Convert JSON to TGDF format' }
      ],
      scriptEndpoints: [
        ...builtinScripts.map(script => ({
          path: `/api/${script}`,
          method: 'POST',
          description: `Execute builtin script: ${script}`,
          infoPath: `/api/${script}/info`
        })),
        ...customScripts.map(script => ({
          path: `/api/${script}`,
          method: 'POST',
          description: `Execute custom script: ${script}`,
          infoPath: `/api/${script}/info`
        }))
      ]
    };
    
    reply.send(createResponse(routes, { type: 'api_directory' }));
  } catch (err) {
    reply.code(500).send(createResponse({
      error: 'Failed to list API endpoints',
      details: err.message
    }, { type: 'error' }));
  }
});

// API route to execute scripts
app.post('/api/:scriptName', async (req, reply) => {
  const scriptName = req.params.scriptName;
  // Prevent path traversal
  if (scriptName.includes('/') || scriptName.includes('\\')) {
    reply.code(400).send(createResponse({ error: 'Invalid script name: Path separators are not allowed' }, { type: 'error' }));
    return;
  }
  if (!('input' in req.body)) {
    reply.code(400).send(createResponse({ error: 'Missing "input" in request body' }, { type: 'error' }));
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
    const module = await loadScript(scriptName);
    const script = module.default;
    const result = await script(input, options); // Pass both input and options
    
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

// API route to get script info
app.get('/api/:scriptName/info', async (req, reply) => {
  const scriptName = req.params.scriptName;
  // Prevent path traversal
  if (scriptName.includes('/') || scriptName.includes('\\')) {
    reply.code(400).send(createResponse({ error: 'Invalid script name: Path separators are not allowed' }, { type: 'error' }));
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

// File watcher setup
const watcher = chokidar.watch(inDir, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: true,
});

watcher.on('add', (filePath) => {
  if (path.extname(filePath) === '.json') {
    processFile(filePath);
  }
});

watcher.on('change', (filePath) => {
  if (path.extname(filePath) === '.json') {
    processFile(filePath);
  }
});

/**
 * Process a JSON file from the in directory.
 * @param {string} filePath - The path to the input JSON file.
 */
async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const outFilePath = path.join(outDir, fileName);
  
  // Get input file modification time
  const stats = fs.statSync(filePath);
  const inputDate = stats.mtime;
  
  // Check if output file exists and has the same input file info
  if (fs.existsSync(outFilePath)) {
    try {
      const outputData = JSON.parse(fs.readFileSync(outFilePath, 'utf8'));
      // Check if already processed (in both formats)
      const isProcessed = 
        (outputData.inputFileName === fileName && outputData.inputFileDate === inputDate.toISOString()) ||
        (outputData.response?.data?.inputFileName?.text === fileName && 
         outputData.response?.data?.inputFileDate?.instant === inputDate.toISOString());
      
      if (isProcessed) {
        // Already processed
        return;
      }
    } catch (e) {
      // Error reading output file, proceed to process
    }
  }
  
  // Read and parse input file
  let input;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    input = JSON.parse(fileContent);
    
    // If input is in TGDF format, convert for processing
    if (isTgdf(input)) {
      input = fromTgdf(input);
    }
  } catch (e) {
    console.error(`Error reading input file ${filePath}: ${e.message}`);
    return;
  }
  
  // Load default script
  try {
    const module = await loadScript('default');
    const defaultScript = module.default;
    const result = await defaultScript(input, { tgdf: true }); // Pass tgdf option
    
    // Add metadata
    const processedResult = {
      ...result,
      inputFileName: fileName,
      inputFileDate: inputDate.toISOString(),
    };
    
    // Always output in TGDF format by default
    const finalOutput = createResponse(processedResult);
      
    fs.writeFileSync(outFilePath, JSON.stringify(finalOutput, null, 2));
  } catch (e) {
    console.error(`Error processing file ${filePath}: ${e.message}`);
  }
}

// Utility routes
app.get('/api/status', (req, reply) => {
  reply.send(createResponse({
    enabled: true,
    version: 'v0.1.0',
    description: 'Tagged Data Format (TGDF) integration is active'
  }));
});

// Convert to TGDF format
app.post('/api/convert', (req, reply) => {
  if (!req.body) {
    reply.code(400).send(createResponse({ error: 'Missing request body' }, { type: 'error' }));
    return;
  }
  
  try {
    const convertedData = ensureTgdf(req.body);
    reply.send(convertedData);
  } catch (e) {
    reply.code(500).send(createResponse({ 
      error: 'Failed to convert to TGDF format', 
      details: e.message 
    }, { type: 'error' }));
  }
});

// Start the server with auto port selection
const start = async () => {
  const startPort = 3000;
  const maxAttempts = 10; // Try up to 10 ports (3000-3009)
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    try {
      await app.listen({ port });
      console.log(`Server listening on port ${port}`);
      console.log('TGDF integration enabled');
      return; // Successfully started
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying next port...`);
        // Continue to next iteration
      } else {
        // For other errors, log and exit
        app.log.error(err);
        process.exit(1);
      }
    }
  }
  
  // If we get here, we couldn't find an available port
  console.error(`Could not find an available port after ${maxAttempts} attempts`);
  process.exit(1);
};

start();