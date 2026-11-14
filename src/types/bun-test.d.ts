declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
    toContain(expected: unknown): void;
    toBeNull(): void;
    toEqual(expected: unknown): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toHaveLength(expected: number): void;
    toThrow(error?: { new (...args: unknown[]): Error }): void;
  };
}
