/**
 * Tests for validation utility functions
 */

import { describe, expect, test } from '@jest/globals';
import { validateInput, validateOptions } from '../../src/utils/validation.js';

describe('Validation Utilities', () => {
  describe('validateInput', () => {
    test('validates input against schema correctly', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };
      
      // Valid input
      const validResult = validateInput({ name: 'John', age: 30 }, schema);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual([]);
      
      // Missing required field
      const invalidResult1 = validateInput({ age: 30 }, schema);
      expect(invalidResult1.isValid).toBe(false);
      expect(invalidResult1.errors.length).toBeGreaterThan(0);
      
      // Wrong type
      const invalidResult2 = validateInput({ name: 'John', age: 'thirty' }, schema);
      expect(invalidResult2.isValid).toBe(false);
      expect(invalidResult2.errors.length).toBeGreaterThan(0);
    });
    
    test('handles empty schema', () => {
      const result = validateInput({ name: 'John' }, null);
      expect(result.isValid).toBe(true);
    });
    
    test('handles null input', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      
      const result = validateInput(null, schema);
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('validateOptions', () => {
    test('validates options against schema correctly', () => {
      const schema = {
        tgdf: {
          type: 'boolean',
          description: 'Whether to return response in TGDF format'
        },
        limit: {
          type: 'number',
          description: 'Limit the number of results'
        }
      };
      
      // Valid options
      const validResult = validateOptions({ tgdf: true, limit: 10 }, schema);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual([]);
      
      // Wrong type
      const invalidResult = validateOptions({ tgdf: 'yes', limit: '10' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      
      // Unknown option
      const unknownResult = validateOptions({ tgdf: true, unknown: 'option' }, schema);
      expect(unknownResult.isValid).toBe(true); // We don't error on unknown options
    });
    
    test('handles empty schema', () => {
      const result = validateOptions({ tgdf: true }, null);
      expect(result.isValid).toBe(true);
    });
    
    test('handles null options', () => {
      const schema = {
        tgdf: { type: 'boolean' }
      };
      
      const result = validateOptions(null, schema);
      expect(result.isValid).toBe(true); // null options are fine, use defaults
    });
  });
});
