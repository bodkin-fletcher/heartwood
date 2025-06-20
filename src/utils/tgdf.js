/**
 * TGDF (Tagged Data Format) Utility Module
 * Implements conversion functions for TGDF format integration
 */

/**
 * Converts a regular value to a TGDF item
 * @param {*} value - The value to convert
 * @param {Object} options - Conversion options
 * @param {boolean} [options.deep=true] - Whether to deeply convert nested objects
 * @param {boolean} [options.preserveArrays=false] - Whether to preserve arrays or convert them to objects with numeric keys
 * @returns {Object} A TGDF formatted item
 */
export function toTgdf(value, options = {}) {
  const { deep = true, preserveArrays = false } = options;
  
  // Handle null or undefined
  if (value === null || value === undefined) {
    return { "null": null };
  }

  // Handle basic types
  if (typeof value === 'string') {
    return { "text": value };
  }
  
  if (typeof value === 'number') {
    // Handle integers vs floats if needed
    // For now, simply convert to string to preserve precision
    return { "number": value.toString() };
  }
  
  if (typeof value === 'boolean') {
    return { "yesno": value };
  }
  
  if (value instanceof Date) {
    return { "instant": value.toISOString() };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (preserveArrays) {
      // Create a list item with array of converted values
      return { 
        "list": deep 
          ? value.map(item => toTgdf(item, options)) 
          : value 
      };
    } else {
      // Convert array to TGDF object with numeric keys
      const result = {};
      value.forEach((item, index) => {
        const key = index.toString();
        result[key] = deep ? toTgdf(item, options) : item;
      });
      return { "items": result };
    }
  }

  // Handle objects
  if (typeof value === 'object') {
    // Check if it's already in TGDF format (has exactly one key)
    const keys = Object.keys(value);
    if (keys.length === 1 && typeof value[keys[0]] !== 'undefined') {
      // It might already be in TGDF format, return as is
      return value;
    }
    
    // Convert to generic object type
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deep ? toTgdf(val, options) : val;
    }
    return { "object": result };
  }

  // Fallback for any other type
  return { "unknown": String(value) };
}

/**
 * Extracts the value from a TGDF item
 * @param {Object} tgdfItem - A TGDF formatted item
 * @param {Object} options - Extraction options
 * @param {boolean} [options.deep=true] - Whether to deeply extract nested objects
 * @param {boolean} [options.preserveArrays=false] - Whether arrays were preserved in the TGDF conversion
 * @returns {*} The extracted value
 */
export function fromTgdf(tgdfItem, options = {}) {
  const { deep = true, preserveArrays = false } = options;
  
  if (!tgdfItem || typeof tgdfItem !== 'object') {
    return tgdfItem;
  }
  
  const keys = Object.keys(tgdfItem);
  if (keys.length !== 1) {
    // Not a valid TGDF item, return as is
    return tgdfItem;
  }
  
  const type = keys[0];
  const value = tgdfItem[type];
  
  // Handle basic types
  switch (type) {
    case 'text':
      return value;
    case 'number':
      return Number(value);
    case 'yesno':
      return Boolean(value);
    case 'null':
      return null;
    case 'instant':
    case 'date':
      return new Date(value);
    case 'list':
      return deep ? value.map(item => fromTgdf(item, options)) : value;
    case 'items':
      if (preserveArrays) {
        // Convert back to array if using numeric keys
        const maxIndex = Math.max(...Object.keys(value).map(Number).filter(n => !isNaN(n)));
        const array = new Array(maxIndex + 1);
        for (let i = 0; i <= maxIndex; i++) {
          if (i in value) {
            array[i] = deep ? fromTgdf(value[i], options) : value[i];
          }
        }
        return array;
      }
      // Fall through to object handling
    case 'object':
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = deep ? fromTgdf(v, options) : v;
      }
      return result;
    default:
      // For custom types, return the value or process it
      return deep && typeof value === 'object' ? fromTgdf(value, options) : value;
  }
}

/**
 * Detects if an object is in TGDF format
 * @param {Object} obj - The object to check
 * @returns {boolean} True if the object appears to be in TGDF format
 */
export function isTgdf(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  
  const keys = Object.keys(obj);
  return keys.length === 1;
}

/**
 * Ensures the input is in TGDF format, converting if necessary
 * @param {*} input - The input to ensure as TGDF
 * @param {Object} options - Conversion options
 * @returns {Object} A TGDF formatted object
 */
export function ensureTgdf(input, options = {}) {
  return isTgdf(input) ? input : toTgdf(input, options);
}

/**
 * Creates a TGDF response wrapper
 * @param {*} data - The data to include in the response
 * @param {Object} options - Response options
 * @param {string} [options.type='response'] - The type of response
 * @param {boolean} [options.tgdf=true] - Whether to convert data to TGDF format
 * @returns {Object} A TGDF formatted response
 */
export function createResponse(data, options = {}) {
  const { type = 'response', tgdf = true } = options;
  
  const payload = tgdf ? ensureTgdf(data) : data;
  
  return {
    [type]: {
      version: "v0.1.0",
      data: payload,
      timestamp: { instant: new Date().toISOString() }
    }
  };
}
