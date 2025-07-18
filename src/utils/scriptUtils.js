/**
 * Utility for validating script info objects
 */

/**
 * Validates a script info object for proper structure
 * @param {Object} info - The script info object to validate
 * @returns {Object} Result with isValid and any errors found
 */
export function validateScriptInfo(info) {
  const errors = [];

  if (!info) {
    return { isValid: false, errors: ['Info object is missing'] };
  }

  // Check for required fields
  if (!info.description) {
    errors.push('Missing description field');
  } else if (typeof info.description !== 'string') {
    errors.push('Description must be a string');
  }

  // Validate input schema
  if (!info.input) {
    errors.push('Missing input schema');
  } else {
    if (info.input.type !== 'object') {
      errors.push('Input schema type must be "object"');
    }

    if (!info.input.properties && !info.input.description) {
      errors.push('Input schema should have either properties or a description');
    }
  }

  // Validate output schema
  if (!info.output) {
    errors.push('Missing output schema');
  } else {
    if (!info.output.type && !info.output.description) {
      errors.push('Output schema should have either a type or a description');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a default info object for a script
 * @param {string} scriptName - The name of the script
 * @returns {Object} A default info object
 */
export function generateDefaultInfo(scriptName) {
  return {
    description: `Default info for ${scriptName} script`,
    input: {
      type: 'object',
      description: 'Input data for the script'
    },
    output: {
      type: 'object',
      description: 'Output data from the script'
    }
  };
}
