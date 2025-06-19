import { ensureTgdf } from '../utils/tgdf.js';

export const info = {
  description: "Default script that processes input data and returns a response. Can output in TGDF format if requested.",
  input: {
    type: "object",
    description: "Any JSON object to process"
  },
  options: {
    tgdf: {
      type: "boolean",
      description: "Whether to return the response in TGDF format"
    }
  },
  output: {
    type: "object",
    description: "Processed data with additional metadata"
  }
};

/**
 * Default script that processes input data.
 * @param {object} input - The input data.
 * @param {object} options - Processing options.
 * @param {boolean} [options.tgdf=true] - Whether to return response in TGDF format.
 * @returns {object} The processed data.
 */
export default function(input, options = {}) {
  const timestamp = new Date().toISOString();
  const result = {
    message: 'Processed data',
    processedAt: timestamp,
    originalData: input
  };
  
  // Convert to TGDF by default unless explicitly disabled
  const useTgdf = options.tgdf !== false;
  if (useTgdf) {
    return ensureTgdf(result);
  }
  
  return result;
};