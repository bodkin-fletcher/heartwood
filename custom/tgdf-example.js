import { toTgdf, fromTgdf, isTgdf, ensureTgdf } from '../src/utils/tgdf.js';

export const info = {
  description:
    'Example script demonstrating TGDF transformations, conversions, and operations. Use this script as a reference for working with TGDF format data.',
  input: {
    type: 'object',
    description: 'Any data structure to convert or manipulate using TGDF.'
  },
  options: {
    operation: {
      type: 'string',
      enum: ['convert', 'extract', 'detect', 'ensure'],
      default: 'convert',
      description:
        "The TGDF operation to perform. 'convert' transforms input to TGDF format, 'extract' transforms from TGDF to regular format, 'detect' checks if input is TGDF format, and 'ensure' converts to TGDF only if not already in that format."
    },
    deep: {
      type: 'boolean',
      default: true,
      description: 'Whether to process nested objects and arrays recursively.'
    },
    preserveArrays: {
      type: 'boolean',
      default: false,
      description:
        'Whether to preserve JavaScript arrays in the TGDF structure rather than converting them to objects with numeric keys.'
    }
  },
  output: {
    type: 'object',
    description: 'Result of the specified TGDF operation.'
  }
};

/**
 * Example script demonstrating TGDF functionality.
 *
 * @param {object} input - The input data.
 * @param {object} options - Operation options.
 * @param {string} options.operation - The operation to perform: convert, extract, detect, or ensure.
 * @param {boolean} options.deep - Whether to process nested structures.
 * @param {boolean} options.preserveArrays - Whether to preserve array structure.
 * @returns {object} The result of the TGDF operation.
 */
export default function (input, options = {}) {
  const { operation = 'convert', deep = true, preserveArrays = false } = options;

  const conversionOptions = { deep, preserveArrays };

  switch (operation) {
    case 'convert':
      return {
        result: toTgdf(input, conversionOptions),
        operation: 'convert',
        description: 'Converted input data to TGDF format'
      };

    case 'extract':
      return {
        result: fromTgdf(input, conversionOptions),
        operation: 'extract',
        description: 'Extracted data from TGDF format to regular format'
      };

    case 'detect':
      return {
        result: isTgdf(input),
        operation: 'detect',
        description: 'Checked if input data is in TGDF format'
      };

    case 'ensure':
      return {
        result: ensureTgdf(input, conversionOptions),
        operation: 'ensure',
        description: 'Ensured data is in TGDF format (converted only if needed)'
      };

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}
