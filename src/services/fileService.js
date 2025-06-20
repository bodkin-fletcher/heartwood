/**
 * File processing service - handles watching and processing input files
 */

import fs from 'fs';
import path from 'path';
import { directories } from '../config/index.js';
import { executeScript } from './scriptService.js';
import { createResponse, fromTgdf, isTgdf } from '../utils/tgdf.js';

/**
 * Process a JSON file from the input directory.
 * @param {string} filePath - The path to the input JSON file.
 */
export async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const outFilePath = path.join(directories.output, fileName);
  
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
  
  // Execute default script
  try {
    const result = await executeScript('default', input, { tgdf: true });
    
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

/**
 * Setup file system watchers for input directory
 * @param {function} [onFileAdded] - Optional callback when a file is added
 * @returns {object} The configured watcher
 */
export function setupFileWatcher(onFileAdded = processFile) {
  // Ensure directories exist
  [directories.builtin, directories.custom, directories.input, directories.output].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Delegate file watching to the caller if provided
  return {
    watchPath: directories.input,
    fileFilter: (filePath) => path.extname(filePath) === '.json',
    onFileAdded,
    onFileChanged: onFileAdded
  };
}
