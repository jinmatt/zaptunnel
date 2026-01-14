import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateFile, formatBytes, getFileInfo, parseExpiration, sleep } from '../../src/utils';
import { getFixturePath, createTempFile, cleanupTempFiles } from '../helpers/test-utils';
import fs from 'fs';
import path from 'path';

describe('validateFile', () => {
  let testFile: string;

  beforeAll(() => {
    testFile = getFixturePath('small-file.txt');
  });

  it('should validate existing file', () => {
    const result = validateFile(testFile);
    expect(result.valid).toBe(true);
    expect(result.absolutePath).toBeDefined();
    expect(path.isAbsolute(result.absolutePath!)).toBe(true);
  });

  it('should handle relative paths', () => {
    const result = validateFile('tests/fixtures/small-file.txt');
    expect(result.valid).toBe(true);
    expect(result.absolutePath).toBeDefined();
  });

  it('should reject non-existent file', () => {
    const result = validateFile('/nonexistent/file.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not exist');
  });

  it('should reject directory', () => {
    const dirPath = path.dirname(testFile);
    const result = validateFile(dirPath);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not a file');
  });

  it('should handle unreadable file error', () => {
    const result = validateFile('/root/unreadable.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 1.75)).toBe('1.75 GB');
  });

  it('should format terabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
  });

  it('should handle large numbers', () => {
    const result = formatBytes(1024 * 1024 * 1024 * 1024 * 5);
    expect(result).toContain('TB');
  });
});

describe('getFileInfo', () => {
  let testFile: string;

  beforeAll(() => {
    testFile = getFixturePath('small-file.txt');
  });

  it('should get file name', () => {
    const info = getFileInfo(testFile);
    expect(info.name).toBe('small-file.txt');
  });

  it('should get file size', () => {
    const info = getFileInfo(testFile);
    expect(info.size).toBeGreaterThan(0);
    expect(typeof info.size).toBe('number');
  });

  it('should format file size', () => {
    const info = getFileInfo(testFile);
    expect(info.sizeFormatted).toBeDefined();
    expect(info.sizeFormatted).toMatch(/\d+(\.\d+)?\s+[KMGT]?B/);
  });

  it('should handle different file names', () => {
    const pdfFile = getFixturePath('test-document.pdf');
    const info = getFileInfo(pdfFile);
    expect(info.name).toBe('test-document.pdf');
  });
});

describe('parseExpiration', () => {
  it('should parse number input', () => {
    expect(parseExpiration(60)).toBe(60);
    expect(parseExpiration(30)).toBe(30);
  });

  it('should parse string input', () => {
    expect(parseExpiration('60')).toBe(60);
    expect(parseExpiration('120')).toBe(120);
  });

  it('should reject invalid string', () => {
    expect(() => parseExpiration('abc')).toThrow('Invalid expiration time');
    // Note: parseInt('12abc') returns 12, so it's parsed as a valid number
  });

  it('should reject negative numbers', () => {
    expect(() => parseExpiration('-10')).toThrow('Invalid expiration time');
    expect(() => parseExpiration(-10)).toThrow('Invalid expiration time');
  });

  it('should reject zero', () => {
    expect(() => parseExpiration('0')).toThrow('Invalid expiration time');
    expect(() => parseExpiration(0)).toThrow('Invalid expiration time');
  });

  it('should parse large numbers', () => {
    expect(parseExpiration('1440')).toBe(1440); // 24 hours
  });
});

describe('sleep', () => {
  it('should resolve after specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small margin
  });

  it('should return a promise', () => {
    const result = sleep(10);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should work with zero time', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

afterAll(() => {
  cleanupTempFiles();
});
