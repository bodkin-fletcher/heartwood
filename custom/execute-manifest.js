import fs from 'fs/promises';
import path from 'path';

export const info = {
  description:
    'Executes file operations based on a provided file_change_manifest, copying files from their existing locations to proposed locations. Supports a dry run mode to simulate operations without making changes.',
  input: {
    type: 'object',
    properties: {
      type: { type: 'string', const: 'file_change_manifest' },
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            existing: {
              type: 'object',
              properties: {
                fullpath: { type: 'string' }
              },
              required: ['fullpath']
            },
            proposed: {
              type: 'object',
              properties: {
                fullpath: { type: 'string' }
              },
              required: ['fullpath']
            }
          },
          required: ['existing', 'proposed']
        }
      }
    },
    required: ['type', 'files']
  },
  options: {
    dryRun: {
      type: 'boolean',
      description: 'If true, simulates the file operations without making any changes.'
    }
  },
  output: {
    type: 'object',
    properties: {
      type: { type: 'string', const: 'file_move_summary' },
      dryRun: { type: 'boolean' },
      timestamp: { type: 'string', format: 'date-time' },
      summary: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          success: { type: 'number' },
          error: { type: 'number' },
          skipped: { type: 'number' }
        }
      },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            existing: { type: 'string' },
            proposed: { type: 'string' },
            status: { type: 'string', enum: ['success', 'error', 'skipped'] },
            message: { type: 'string' }
          }
        }
      }
    }
  }
};

export default async function executeManifest(input, options = {}) {
  // Validate input
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }
  if (input.type !== 'file_change_manifest') {
    throw new Error('Input must have type "file_change_manifest"');
  }
  if (!Array.isArray(input.files)) {
    throw new Error('Input must have a "files" array');
  }

  const dryRun = options.dryRun || false;
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Process each file in the manifest
  for (const file of input.files) {
    if (!file.proposed || !file.proposed.fullpath) {
      results.push({
        existing: file.existing.fullpath,
        status: 'skipped',
        message: 'No proposed path'
      });
      skippedCount++;
      continue;
    }

    const existingPath = file.existing.fullpath;
    const proposedPath = file.proposed.fullpath;

    try {
      // Check if the source file exists
      await fs.access(existingPath);

      if (dryRun) {
        // Simulate success without copying
        results.push({
          existing: existingPath,
          proposed: proposedPath,
          status: 'success',
          message: `Would copy to ${proposedPath}`
        });
        successCount++;
      } else {
        // Create the proposed directory if it doesn’t exist
        const proposedDir = path.dirname(proposedPath);
        await fs.mkdir(proposedDir, { recursive: true });

        // Copy the file to the proposed location
        await fs.copyFile(existingPath, proposedPath);

        results.push({
          existing: existingPath,
          proposed: proposedPath,
          status: 'success',
          message: `Copied to ${proposedPath}`
        });
        successCount++;
      }
    } catch (error) {
      const errorMessage = dryRun
        ? `Source file not found: ${error.message}`
        : `Failed to copy: ${error.message}`;
      results.push({
        existing: existingPath,
        proposed: proposedPath,
        status: 'error',
        message: errorMessage
      });
      errorCount++;
    }
  }

  // Generate summary
  const timestamp = new Date().toISOString();
  const summary = {
    total: input.files.length,
    success: successCount,
    error: errorCount,
    skipped: skippedCount
  };

  return { type: 'file_move_summary', dryRun, timestamp, summary, results };
}
