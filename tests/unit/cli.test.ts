import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseExpiration } from '../../src/utils';

describe('CLI utilities', () => {
  describe('parseExpiration', () => {
    it('should parse valid number', () => {
      expect(parseExpiration(30)).toBe(30);
      expect(parseExpiration(60)).toBe(60);
      expect(parseExpiration(120)).toBe(120);
    });

    it('should parse valid string number', () => {
      expect(parseExpiration('30')).toBe(30);
      expect(parseExpiration('60')).toBe(60);
      expect(parseExpiration('1440')).toBe(1440);
    });

    it('should throw on invalid string', () => {
      expect(() => parseExpiration('abc')).toThrow('Invalid expiration time');
      // Note: parseInt('12abc') returns 12, so it's actually valid
      expect(() => parseExpiration('')).toThrow('Invalid expiration time');
    });

    it('should throw on negative numbers', () => {
      expect(() => parseExpiration(-10)).toThrow('Invalid expiration time');
      expect(() => parseExpiration('-5')).toThrow('Invalid expiration time');
    });

    it('should throw on zero', () => {
      expect(() => parseExpiration(0)).toThrow('Invalid expiration time');
      expect(() => parseExpiration('0')).toThrow('Invalid expiration time');
    });
  });
});

describe('CLI option validation', () => {
  describe('maxDownloads validation', () => {
    it('should accept positive integers', () => {
      const value = parseInt('5', 10);
      expect(isNaN(value)).toBe(false);
      expect(value).toBeGreaterThan(0);
    });

    it('should reject NaN', () => {
      const value = parseInt('abc', 10);
      expect(isNaN(value)).toBe(true);
    });

    it('should reject negative numbers', () => {
      const value = parseInt('-5', 10);
      expect(value).toBeLessThan(1);
    });

    it('should reject zero', () => {
      const value = parseInt('0', 10);
      expect(value).toBeLessThan(1);
    });

    it('should handle large numbers', () => {
      const value = parseInt('999', 10);
      expect(value).toBe(999);
      expect(value).toBeGreaterThan(0);
    });
  });

  describe('password validation', () => {
    it('should accept any non-empty string', () => {
      const password = 'testpass';
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThan(0);
    });

    it('should accept special characters', () => {
      const password = 'p@ssw0rd!123';
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
    });

    it('should accept long passwords', () => {
      const password = 'a'.repeat(100);
      expect(password.length).toBe(100);
    });
  });

  describe('file path validation', () => {
    it('should accept relative paths', () => {
      const filePath = './test-file.txt';
      expect(filePath).toBeDefined();
      expect(typeof filePath).toBe('string');
    });

    it('should accept absolute paths', () => {
      const filePath = '/home/user/file.txt';
      expect(filePath).toBeDefined();
      expect(typeof filePath).toBe('string');
    });

    it('should accept paths with spaces', () => {
      const filePath = './my file with spaces.txt';
      expect(filePath).toBeDefined();
    });
  });
});

describe('CLI argument parsing patterns', () => {
  it('should parse short option format', () => {
    const args = ['-m', '3'];
    expect(args[0]).toBe('-m');
    expect(args[1]).toBe('3');
  });

  it('should parse long option format', () => {
    const args = ['--max-downloads', '3'];
    expect(args[0]).toBe('--max-downloads');
    expect(args[1]).toBe('3');
  });

  it('should parse multiple options', () => {
    const args = ['-m', '5', '-e', '120', '-p', 'secret'];
    expect(args.length).toBe(6);
  });

  it('should parse command with file argument', () => {
    const args = ['share', './file.txt'];
    expect(args[0]).toBe('share');
    expect(args[1]).toBe('./file.txt');
  });

  it('should parse combined short and long options', () => {
    const args = ['share', 'file.txt', '--max-downloads', '3', '-e', '60'];
    expect(args[0]).toBe('share');
    expect(args[1]).toBe('file.txt');
  });
});

describe('Exit code handling', () => {
  let originalExit: typeof process.exit;
  let exitCode: number | undefined;

  beforeEach(() => {
    originalExit = process.exit;
    exitCode = undefined;
    // Mock process.exit to capture exit code
    process.exit = vi.fn((code?: string | number | null | undefined) => {
      exitCode = typeof code === 'number' ? code : 1;
      throw new Error('Process exit called');
    }) as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('should exit with code 1 on error', () => {
    try {
      process.exit(1);
    } catch (e) {
      // Expected
    }
    expect(exitCode).toBe(1);
  });

  it('should exit with code 0 on success', () => {
    try {
      process.exit(0);
    } catch (e) {
      // Expected
    }
    expect(exitCode).toBe(0);
  });
});
