// Check if a string looks like a hash (64 char hex string for SHA-256)
export function isHashed(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
