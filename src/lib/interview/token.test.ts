import { describe, expect, it } from 'vitest';
import { validateTokenFormat } from './token';

describe('validateTokenFormat', () => {
  it('returns true for a valid UUID v4 token', () => {
    expect(validateTokenFormat('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for uppercase UUID v4', () => {
    expect(validateTokenFormat('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('returns true for mixed-case UUID v4', () => {
    expect(validateTokenFormat('550e8400-E29B-41d4-a716-446655440000')).toBe(true);
  });

  it('returns false for a UUID v1', () => {
    expect(validateTokenFormat('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(validateTokenFormat('')).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(validateTokenFormat('not-a-uuid-at-all')).toBe(false);
  });

  it('returns false for SQL injection attempt', () => {
    expect(validateTokenFormat("'; DROP TABLE interviews; --")).toBe(false);
  });

  it('returns false for UUID without hyphens', () => {
    expect(validateTokenFormat('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('returns false for UUID with wrong variant bits', () => {
    // variant bits must be 8, 9, a, or b in position 19
    expect(validateTokenFormat('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
  });
});
