import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { FileServerOrchestrator } from '../../src/fileServer';
import { getFixturePath, mockConsole, sleep } from '../helpers/test-utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let hasCloudflared = false;

// Check if cloudflared is installed
beforeAll(async () => {
  try {
    await execAsync('cloudflared --version');
    hasCloudflared = true;
  } catch (e) {
    console.log('⚠️  Cloudflared not found - skipping orchestrator integration tests');
    hasCloudflared = false;
  }
});

describe('FileServerOrchestrator Integration', () => {
  let orchestrator: FileServerOrchestrator;
  let restoreConsole: () => void;

  beforeEach(() => {
    orchestrator = new FileServerOrchestrator();
    restoreConsole = mockConsole();
  });

  afterEach(async () => {
    restoreConsole();
    // Clean up any running servers
    if (orchestrator['server']) {
      await orchestrator['cleanup']();
    }
  });

  describe('share with valid file', () => {
    it.skipIf(!hasCloudflared)('should start server and tunnel', async () => {
      const testFile = getFixturePath('small-file.txt');

      // Start share in background (it runs indefinitely)
      const sharePromise = orchestrator.share({
        filePath: testFile,
        maxDownloads: 1,
        expire: 1, // 1 minute
      });

      // Give it time to start up
      await sleep(2000);

      // Verify server and tunnel are running
      expect(orchestrator['server']).toBeDefined();
      expect(orchestrator['tunnel']).toBeDefined();
      
      const url = orchestrator['tunnel']?.getUrl();
      expect(url).toMatch(/https:\/\/.*\.trycloudflare\.com/);

      // Clean up
      await orchestrator['cleanup']();
    }, 40000);

    it.skipIf(!hasCloudflared)('should handle password protection', async () => {
      const testFile = getFixturePath('small-file.txt');

      const sharePromise = orchestrator.share({
        filePath: testFile,
        maxDownloads: 1,
        expire: 1,
        password: 'testpass',
      });

      await sleep(2000);

      expect(orchestrator['server']).toBeDefined();

      await orchestrator['cleanup']();
    }, 40000);

    it.skipIf(!hasCloudflared)('should set expiration timer', async () => {
      const testFile = getFixturePath('small-file.txt');

      const sharePromise = orchestrator.share({
        filePath: testFile,
        maxDownloads: 1,
        expire: 1,
      });

      await sleep(2000);

      expect(orchestrator['expirationTimer']).toBeDefined();

      await orchestrator['cleanup']();
    }, 40000);
  });

  describe('share with invalid file', () => {
    it('should exit on non-existent file', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      try {
        await orchestrator.share({
          filePath: '/nonexistent/file.txt',
          maxDownloads: 1,
          expire: 60,
        });
      } catch (e) {
        // Expected
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should exit on directory path', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      try {
        await orchestrator.share({
          filePath: getFixturePath(''),
          maxDownloads: 1,
          expire: 60,
        });
      } catch (e) {
        // Expected
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });
  });

  describe('cleanup', () => {
    it.skipIf(!hasCloudflared)('should stop server and tunnel', async () => {
      const testFile = getFixturePath('small-file.txt');

      const sharePromise = orchestrator.share({
        filePath: testFile,
        maxDownloads: 1,
        expire: 1,
      });

      await sleep(2000);

      const tunnelWasRunning = orchestrator['tunnel']?.isRunning();
      expect(tunnelWasRunning).toBe(true);

      await orchestrator['cleanup']();

      expect(orchestrator['tunnel']?.isRunning()).toBe(false);
    }, 40000);

    it.skipIf(!hasCloudflared)('should clear expiration timer', async () => {
      const testFile = getFixturePath('small-file.txt');

      const sharePromise = orchestrator.share({
        filePath: testFile,
        maxDownloads: 1,
        expire: 1,
      });

      await sleep(2000);

      expect(orchestrator['expirationTimer']).toBeDefined();

      await orchestrator['cleanup']();

      expect(orchestrator['expirationTimer']).toBeNull();
    }, 40000);
  });
});
