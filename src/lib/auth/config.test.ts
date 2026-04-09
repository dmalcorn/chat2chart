import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './config';

describe('Auth Config — bcrypt', () => {
  it('hashPassword produces a valid bcrypt hash', async () => {
    const hash = await hashPassword('testpassword');
    expect(hash).toBeDefined();
    expect(hash).toMatch(/^\$2[aby]?\$\d+\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('hashPassword produces different hashes for same input (salted)', async () => {
    const hash1 = await hashPassword('testpassword');
    const hash2 = await hashPassword('testpassword');
    expect(hash1).not.toBe(hash2);
  });

  it('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('correctpassword');
    const result = await verifyPassword('correctpassword', hash);
    expect(result).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correctpassword');
    const result = await verifyPassword('wrongpassword', hash);
    expect(result).toBe(false);
  });

  it('verifyPassword returns false for empty password against hash', async () => {
    const hash = await hashPassword('somepassword');
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });
});
