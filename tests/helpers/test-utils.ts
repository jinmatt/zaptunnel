import { vi } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

/**
 * Mock child process for cloudflared tunnel testing
 */
export function createMockChildProcess(options: {
  url?: string;
  shouldError?: boolean;
  exitCode?: number;
  timeout?: number;
} = {}) {
  const mockProcess = new EventEmitter() as any;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.kill = vi.fn();

  // Simulate cloudflared output
  if (options.url) {
    setTimeout(() => {
      mockProcess.stderr.emit('data', Buffer.from(`tunnel URL: ${options.url}`));
    }, options.timeout || 100);
  }

  if (options.shouldError) {
    setTimeout(() => {
      mockProcess.emit('error', new Error('Mock error'));
    }, options.timeout || 100);
  }

  if (options.exitCode !== undefined) {
    setTimeout(() => {
      mockProcess.emit('exit', options.exitCode);
    }, options.timeout || 200);
  }

  return mockProcess;
}

/**
 * Create a temporary test file
 */
export function createTempFile(content: string = 'test content'): string {
  const tempDir = path.join(__dirname, '../fixtures');
  const tempFile = path.join(tempDir, `temp-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, content);
  return tempFile;
}

/**
 * Clean up temporary files
 */
export function cleanupTempFiles() {
  const tempDir = path.join(__dirname, '../fixtures');
  const files = fs.readdirSync(tempDir);
  files.forEach((file) => {
    if (file.startsWith('temp-')) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  });
}

/**
 * Wait for event to be emitted
 */
export function waitForEvent(
  emitter: EventEmitter,
  event: string,
  timeout: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    emitter.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Get fixture file path
 */
export function getFixturePath(filename: string): string {
  return path.join(__dirname, '../fixtures', filename);
}

/**
 * Mock console methods to suppress output during tests
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;

  console.log = vi.fn();
  console.error = vi.fn();

  return () => {
    console.log = originalLog;
    console.error = originalError;
  };
}

/**
 * Sleep utility for testing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
