// Password hashing utilities for client-side security
// Note: For true security, passwords should be handled server-side

const SALT = 'ffk-shop-2024-salt';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sync version for migration (uses simple hash for backwards compatibility check)
export function simpleHash(password: string): string {
  let hash = 0;
  const str = password + SALT;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check if a string looks like a hash (64 char hex string for SHA-256)
export function isHashed(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
