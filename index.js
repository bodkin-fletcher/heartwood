import fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';

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
 * @returns {function|null} The exported function from the script or null if not found.
 */
async function loadScript(scriptName) {
  if (scriptCache.has(scriptName)) {
    return scriptCache.get(scriptName);
  }
  try {
    const customPath = path.join(customDir, `${scriptName}.js`);
    const script = await import(customPath);
    scriptCache.set(scriptName, script.default);
    return script.default;
  } catch (e) {
    try {
      const builtinPath = path.join(builtinDir, `${scriptName}.js`);
      const script = await import(builtinPath);
      scriptCache.set(scriptName, script.default);
      return script.default;
    } catch (e) {
      return null;
    }
  }
}

// API route to execute scripts
app.post('/api/:scriptName', async (req, reply) => {
  const scriptName = req.params.scriptName;
  const script = await loadScript(scriptName);
  if (!script) {
    reply.code(404).send({ error: 'Script not found' });
    return;
  }
  try {
    const input = req.body.input;
    const result = await script(input);
    reply.send(result);
  } catch (e) {
    reply.code(500).send({ error: 'Script execution failed', message: e.message });
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
    console.error(`Error reading input file ${filePath}:`, e);
    return;
  }
  
  // Load default script
  const defaultScript = await loadScript('default');
  if (!defaultScript) {
    console.error('Default script not found');
    return;
  }
  
  // Execute script and save output
  try {
    const result = await defaultScript(input);
    const output = {
      ...result,
      inputFileName: fileName,
      inputFileDate: inputDate.toISOString(),
    };
    fs.writeFileSync(outFilePath, JSON.stringify(output, null, 2));
  } catch (e) {
    console.error(`Error processing file ${filePath}:`, e);
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