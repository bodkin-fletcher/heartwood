/**
 * Input validation utilities for scripts
 */

/**
 * Validates input data against a script's input schema
 * @param {*} input - The input data to validate
 * @param {Object} schema - The input schema from the script's info
 * @returns {Object} Validation result with isValid flag and any errors
 */
export function validateInput(input, schema) {
  if (!schema) {
    return { isValid: true }; // No schema means no validation
  }

  const errors = [];

  // Type check
  if (schema.type) {
    const actualType = Array.isArray(input) ? 'array' : typeof input;
    if (schema.type === 'object' && actualType !== 'object') {
      errors.push(`Expected input to be an object, got ${actualType}`);
    } else if (schema.type === 'array' && !Array.isArray(input)) {
      errors.push(`Expected input to be an array, got ${actualType}`);
    } else if (schema.type !== 'object' && schema.type !== 'array' && actualType !== schema.type) {
      errors.push(`Expected input to be type ${schema.type}, got ${actualType}`);
    }
  }

  // Required fields check
  if (
    schema.required &&
    Array.isArray(schema.required) &&
    typeof input === 'object' &&
    input !== null
  ) {
    for (const field of schema.required) {
      if (!(field in input)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Properties check
  if (schema.properties && typeof input === 'object' && input !== null) {
    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      if (propName in input) {
        const value = input[propName];

        // Type check for property
        if (propSchema.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          const expectedType = propSchema.type;

          if (expectedType === 'array' && !Array.isArray(value)) {
            errors.push(`Property ${propName}: Expected array, got ${actualType}`);
          } else if (expectedType !== 'array' && actualType !== expectedType) {
            errors.push(`Property ${propName}: Expected ${expectedType}, got ${actualType}`);
          }
        }

        // Enum check
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(
            `Property ${propName}: Value must be one of [${propSchema.enum.join(', ')}], got ${value}`
          );
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a validation error response
 * @param {string[]} errors - List of validation error messages
 * @returns {Object} Error object with validation details
 */
export function createValidationError(errors) {
  const error = new Error('Input validation failed');
  error.validation = errors;
  error.statusCode = 400;
  return error;
}
