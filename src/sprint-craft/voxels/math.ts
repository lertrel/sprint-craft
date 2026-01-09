/**
 * Floor-division that behaves correctly for negative numerators.
 * Example: floorDiv(-1, 16) === -1.
 */
export function floorDiv(n: number, d: number): number {
  return Math.floor(n / d);
}

/**
 * Modulo that returns a value in [0, d).
 * Example: mod(-1, 16) === 15.
 */
export function mod(n: number, d: number): number {
  // JS % keeps the sign of n; normalize into [0, d).
  return ((n % d) + d) % d;
}

