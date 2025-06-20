/**
 * Tests for TGDF utility functions
 */

import { describe, expect, test } from '@jest/globals';
import { toTgdf, fromTgdf, isTgdf, ensureTgdf } from '../../src/utils/tgdf.js';

describe('TGDF Utilities', () => {
  describe('toTgdf', () => {
    test('converts string values correctly', () => {
      expect(toTgdf('test string')).toEqual({ text: 'test string' });
    });
    
    test('converts number values correctly', () => {
      expect(toTgdf(42)).toEqual({ number: '42' });
      expect(toTgdf(3.14)).toEqual({ number: '3.14' });
    });
    
    test('converts boolean values correctly', () => {
      expect(toTgdf(true)).toEqual({ boolean: 'true' });
      expect(toTgdf(false)).toEqual({ boolean: 'false' });
    });
    
    test('converts null correctly', () => {
      expect(toTgdf(null)).toEqual({ null: null });
    });
    
    test('converts objects correctly', () => {
      const obj = { name: 'test', value: 123 };
      const result = toTgdf(obj);
      
      expect(result).toMatchObject({
        object: expect.any(Object)
      });
      expect(result.object.name).toEqual({ text: 'test' });
      expect(result.object.value).toEqual({ number: '123' });
    });
    
    test('converts arrays correctly with preserveArrays=true', () => {
      const arr = [1, 'test', true];
      const result = toTgdf(arr, { preserveArrays: true });
      
      expect(result).toMatchObject({
        array: expect.any(Array)
      });
      expect(result.array[0]).toEqual({ number: '1' });
      expect(result.array[1]).toEqual({ text: 'test' });
      expect(result.array[2]).toEqual({ boolean: 'true' });
    });
    
    test('converts arrays to objects with preserveArrays=false', () => {
      const arr = [1, 'test', true];
      const result = toTgdf(arr, { preserveArrays: false });
      
      expect(result).toMatchObject({
        object: expect.any(Object)
      });
      expect(result.object['0']).toEqual({ number: '1' });
      expect(result.object['1']).toEqual({ text: 'test' });
      expect(result.object['2']).toEqual({ boolean: 'true' });
    });
  });
  
  describe('fromTgdf', () => {
    test('converts TGDF string back to string', () => {
      expect(fromTgdf({ text: 'test string' })).toEqual('test string');
    });
    
    test('converts TGDF number back to number', () => {
      expect(fromTgdf({ number: '42' })).toEqual(42);
      expect(fromTgdf({ number: '3.14' })).toEqual(3.14);
    });
    
    test('converts TGDF boolean back to boolean', () => {
      expect(fromTgdf({ boolean: 'true' })).toEqual(true);
      expect(fromTgdf({ boolean: 'false' })).toEqual(false);
    });
    
    test('converts TGDF null back to null', () => {
      expect(fromTgdf({ null: null })).toEqual(null);
    });
    
    test('converts TGDF object back to object', () => {
      const tgdfObj = {
        object: {
          name: { text: 'test' },
          value: { number: '123' }
        }
      };
      expect(fromTgdf(tgdfObj)).toEqual({ name: 'test', value: 123 });
    });
    
    test('converts TGDF array back to array', () => {
      const tgdfArr = {
        array: [
          { number: '1' },
          { text: 'test' },
          { boolean: 'true' }
        ]
      };
      expect(fromTgdf(tgdfArr)).toEqual([1, 'test', true]);
    });
  });
  
  describe('isTgdf', () => {
    test('returns true for valid TGDF objects', () => {
      expect(isTgdf({ text: 'test' })).toBe(true);
      expect(isTgdf({ number: '42' })).toBe(true);
      expect(isTgdf({ boolean: 'true' })).toBe(true);
      expect(isTgdf({ null: null })).toBe(true);
      expect(isTgdf({ object: {} })).toBe(true);
      expect(isTgdf({ array: [] })).toBe(true);
    });
    
    test('returns false for non-TGDF objects', () => {
      expect(isTgdf('test')).toBe(false);
      expect(isTgdf(42)).toBe(false);
      expect(isTgdf(true)).toBe(false);
      expect(isTgdf(null)).toBe(false);
      expect(isTgdf({})).toBe(false);
      expect(isTgdf([])).toBe(false);
      expect(isTgdf({ invalid: 'tag' })).toBe(false);
    });
  });
  
  describe('ensureTgdf', () => {
    test('returns TGDF object unchanged', () => {
      const tgdfObj = { text: 'test' };
      expect(ensureTgdf(tgdfObj)).toBe(tgdfObj);
    });
    
    test('converts non-TGDF object to TGDF', () => {
      expect(ensureTgdf('test')).toEqual({ text: 'test' });
    });
  });
});
