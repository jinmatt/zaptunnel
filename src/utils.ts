import fs from 'fs';
import path from 'path';

/**
 * Validates if a file exists and is readable
 */
export function validateFile(filePath: string): { valid: boolean; error?: string; absolutePath?: string } {
  try {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      return { valid: false, error: `File does not exist: ${filePath}` };
    }

    const stats = fs.statSync(absolutePath);

    if (!stats.isFile()) {
      return { valid: false, error: `Path is not a file: ${filePath}` };
    }

    // Check if file is readable
    fs.accessSync(absolutePath, fs.constants.R_OK);

    return { valid: true, absolutePath };
  } catch (error) {
    return { valid: false, error: `Cannot access file: ${(error as Error).message}` };
  }
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Gets file information
 */
export function getFileInfo(filePath: string): { name: string; size: number; sizeFormatted: string } {
  const stats = fs.statSync(filePath);
  const name = path.basename(filePath);
  const size = stats.size;
  const sizeFormatted = formatBytes(size);

  return { name, size, sizeFormatted };
}

/**
 * Sleeps for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parses expiration time string to minutes
 */
export function parseExpiration(expire: string | number): number {
  if (typeof expire === 'number') {
    return expire;
  }

  const num = parseInt(expire, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error('Invalid expiration time');
  }

  return num;
}
