/**
 * Script service - handles loading and executing scripts
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { directories } from '../config/index.js';
import { validateScriptInfo, generateDefaultInfo } from '../utils/scriptUtils.js';

// Script cache to avoid reloading scripts multiple times
const scriptCache = new Map();

/**
 * Load a script module from custom or builtin directories.
 * @param {string} scriptName - The name of the script without .js extension.
 * @returns {object} The exported module from the script.
 * @throws {Error} If the script cannot be found or loaded.
 */
export async function loadScript(scriptName) {
  if (scriptCache.has(scriptName)) {
    return scriptCache.get(scriptName);
  }
  const customPath = path.join(directories.custom, `${scriptName}.js`);
  const builtinPath = path.join(directories.builtin, `${scriptName}.js`);
  
  if (fs.existsSync(customPath)) {
    try {
      const module = await import(pathToFileURL(customPath).href);
      
      // Validate and enhance info object if present
      if (module.info) {
        const validation = validateScriptInfo(module.info);
        if (!validation.isValid) {
          console.warn(`Warning: Script "${scriptName}" has invalid info:`, validation.errors);
        }
      } else {
        // Add default info if missing
        module.info = generateDefaultInfo(scriptName);
      }
      
      scriptCache.set(scriptName, module);
      return module;
    } catch (e) {
      throw new Error(`Failed to load script from custom directory (${customPath}): ${e.message}`);
    }
  } else if (fs.existsSync(builtinPath)) {
    try {
      const module = await import(pathToFileURL(builtinPath).href);
      
      // Validate and enhance info object if present
      if (module.info) {
        const validation = validateScriptInfo(module.info);
        if (!validation.isValid) {
          console.warn(`Warning: Script "${scriptName}" has invalid info:`, validation.errors);
        }
      } else {
        // Add default info if missing
        module.info = generateDefaultInfo(scriptName);
      }
      
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

/**
 * Execute a script with given input and options.
 * @param {string} scriptName - Name of the script to execute.
 * @param {object} input - Input data for the script.
 * @param {object} options - Options for the script execution.
 * @returns {Promise<object>} Result of the script execution.
 */
export async function executeScript(scriptName, input, options = {}) {
  const module = await loadScript(scriptName);
  const script = module.default;
  
  if (typeof script !== 'function') {
    throw new Error(`Script "${scriptName}" does not export a default function`);
  }
  
  return await script(input, options);
}

/**
 * Get available script names from both builtin and custom directories.
 * @returns {Promise<object>} Object containing arrays of builtin and custom script names.
 */
export async function getAvailableScripts() {
  const scripts = { builtin: [], custom: [] };
  
  try {
    const builtinFiles = await fs.promises.readdir(directories.builtin);
    scripts.builtin = builtinFiles
      .filter(file => file.endsWith('.js'))
      .map(file => file.slice(0, -3)); // Remove .js extension
  } catch (err) {
    console.error('Failed to read builtin directory:', err);
  }
  
  try {
    const customFiles = await fs.promises.readdir(directories.custom);
    scripts.custom = customFiles
      .filter(file => file.endsWith('.js'))
      .map(file => file.slice(0, -3)); // Remove .js extension
  } catch (err) {
    console.error('Failed to read custom directory:', err);
  }
  
  return scripts;
}
