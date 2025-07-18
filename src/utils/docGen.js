/**
 * Documentation generator utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { getAvailableScripts, loadScript } from '../services/scriptService.js';

/**
 * Generate markdown documentation for a script from its info object
 * @param {string} scriptName - Name of the script
 * @param {Object} info - Script info object
 * @param {string} scriptType - Either 'builtin' or 'custom'
 * @returns {string} Markdown documentation
 */
export function generateScriptDoc(scriptName, info, scriptType) {
  if (!info) {
    return `# ${scriptName}\n\nNo documentation available.`;
  }

  let doc = `# ${scriptName}\n\n`;

  // Add description
  if (info.description) {
    doc += `${info.description}\n\n`;
  }

  // Add source information
  doc += `**Type:** ${scriptType}\n\n`;

  // Add input schema
  doc += '## Input\n\n';
  if (info.input) {
    if (info.input.description) {
      doc += `${info.input.description}\n\n`;
    }

    if (info.input.properties) {
      doc += '### Properties\n\n';
      doc += '| Property | Type | Required | Description |\n';
      doc += '|----------|------|----------|-------------|\n';

      const required = info.input.required || [];

      Object.entries(info.input.properties).forEach(([propName, propSchema]) => {
        const isRequired = required.includes(propName);
        const description = propSchema.description || '';
        const type = propSchema.type || 'any';

        doc += `| \`${propName}\` | \`${type}\` | ${isRequired ? 'Yes' : 'No'} | ${description} |\n`;
      });

      doc += '\n';
    }
  } else {
    doc += 'No input schema specified.\n\n';
  }

  // Add options schema
  if (info.options && Object.keys(info.options).length > 0) {
    doc += '## Options\n\n';
    doc += '| Option | Type | Default | Description |\n';
    doc += '|--------|------|---------|-------------|\n';

    Object.entries(info.options).forEach(([optName, optSchema]) => {
      const type = optSchema.type || 'any';
      const description = optSchema.description || '';
      const defaultValue = optSchema.default !== undefined ? `\`${optSchema.default}\`` : '';

      doc += `| \`${optName}\` | \`${type}\` | ${defaultValue} | ${description} |\n`;
    });

    doc += '\n';
  }

  // Add output schema
  doc += '## Output\n\n';
  if (info.output) {
    if (info.output.description) {
      doc += `${info.output.description}\n\n`;
    }

    if (info.output.properties) {
      doc += '### Properties\n\n';
      doc += '| Property | Type | Description |\n';
      doc += '|----------|------|-------------|\n';

      Object.entries(info.output.properties).forEach(([propName, propSchema]) => {
        const description = propSchema.description || '';
        const type = propSchema.type || 'any';

        doc += `| \`${propName}\` | \`${type}\` | ${description} |\n`;
      });

      doc += '\n';
    }
  } else {
    doc += 'No output schema specified.\n\n';
  }

  return doc;
}

/**
 * Generate documentation for all available scripts
 * @returns {Promise<Object>} Object containing generated documentation by script name
 */
export async function generateAllDocs() {
  const scripts = await getAvailableScripts();
  const docs = {};

  // Generate docs for builtin scripts
  for (const scriptName of scripts.builtin) {
    try {
      const module = await loadScript(scriptName);
      docs[scriptName] = generateScriptDoc(scriptName, module.info, 'builtin');
    } catch (error) {
      console.error(`Error generating docs for ${scriptName}:`, error);
      docs[scriptName] = `# ${scriptName}\n\nError generating documentation: ${error.message}`;
    }
  }

  // Generate docs for custom scripts
  for (const scriptName of scripts.custom) {
    try {
      const module = await loadScript(scriptName);
      docs[scriptName] = generateScriptDoc(scriptName, module.info, 'custom');
    } catch (error) {
      console.error(`Error generating docs for ${scriptName}:`, error);
      docs[scriptName] = `# ${scriptName}\n\nError generating documentation: ${error.message}`;
    }
  }

  return docs;
}

/**
 * Generate index page for script documentation
 * @param {Object} docs - Object containing script docs
 * @returns {string} Markdown index page
 */
export function generateDocsIndex(docs) {
  let index = '# Script Documentation\n\n';

  index += '## Available Scripts\n\n';

  Object.keys(docs)
    .sort()
    .forEach((scriptName) => {
      index += `- [${scriptName}](${scriptName}.md)\n`;
    });

  return index;
}

/**
 * Save generated documentation to files
 * @param {string} outputDir - Directory to save documentation files
 * @param {Object} docs - Object containing script docs
 * @returns {Promise<void>}
 */
export async function saveDocs(outputDir, docs) {
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  // Save individual script docs
  for (const [scriptName, doc] of Object.entries(docs)) {
    const filePath = path.join(outputDir, `${scriptName}.md`);
    await fs.writeFile(filePath, doc, 'utf8');
  }

  // Generate and save index
  const index = generateDocsIndex(docs);
  await fs.writeFile(path.join(outputDir, 'index.md'), index, 'utf8');

  // Generate README for the docs folder
  await fs.writeFile(
    path.join(outputDir, 'README.md'),
    '# Heartwood Script Documentation\n\n' +
      'This directory contains automatically generated documentation for all scripts in the system.\n\n' +
      '- [Script Index](index.md)\n',
    'utf8'
  );
}
