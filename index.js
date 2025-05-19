import fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import { pathToFileURL } from 'url'; // Import pathToFileURL to convert paths to URLs

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
 * Load a script from custom or builtin directories.
 * @param {string} scriptName - The name of the script without .js extension.
 * @returns {function} The exported function from the script.
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
      const script = await import(pathToFileURL(customPath).href); // Convert to file:// URL
      scriptCache.set(scriptName, script.default);
      return script.default;
    } catch (e) {
      throw new Error(`Failed to load script from custom directory (${customPath}): ${e.message}`);
    }
  } else if (fs.existsSync(builtinPath)) {
    try {
      const script = await import(pathToFileURL(builtinPath).href); // Convert to file:// URL
      scriptCache.set(scriptName, script.default);
      return script.default;
    } catch (e) {
      throw new Error(`Failed to load script from builtin directory (${builtinPath}): ${e.message}`);
    }
  } else {
    throw new Error(`Script "${scriptName}" not found. Looked in:
- Custom directory: ${customPath}
- Builtin directory: ${builtinPath}`);
  }
}

// API route to execute scripts
app.post('/api/:scriptName', async (req, reply) => {
  const scriptName = req.params.scriptName;
  // Prevent path traversal
  if (scriptName.includes('/') || scriptName.includes('\\')) {
    reply.code(400).send({ error: 'Invalid script name: Path separators are not allowed' });
    return;
  }
  if (!('input' in req.body)) {
    reply.code(400).send({ error: 'Missing "input" in request body' });
    return;
  }
  const input = req.body.input;
  const options = req.body.options || {}; // Default to empty object if not provided
  try {
    const script = await loadScript(scriptName);
    const result = await script(input, options); // Pass both input and options
    reply.send(result);
  } catch (e) {
    if (e.message.includes('not found')) {
      reply.code(404).send({ error: e.message });
    } else {
      reply.code(500).send({ error: 'Script loading or execution failed', details: e.message });
    }
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
      if (outputData.inputFileName === fileName && outputData.inputFileDate === inputDate.toISOString()) {
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
    input = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Error reading input file ${filePath}: ${e.message}`);
    return;
  }
  
  // Load default script
  try {
    const defaultScript = await loadScript('default');
    const result = await defaultScript(input, {}); // Pass empty options
    const output = {
      ...result,
      inputFileName: fileName,
      inputFileDate: inputDate.toISOString(),
    };
    fs.writeFileSync(outFilePath, JSON.stringify(output, null, 2));
  } catch (e) {
    console.error(`Error processing file ${filePath}: ${e.message}`);
  }
}

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Server listening on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();