import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { CloudflareTunnel } from '../../src/tunnel';
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
    console.log('⚠️  Cloudflared not found - skipping tunnel integration tests');
    hasCloudflared = false;
  }
});

describe('CloudflareTunnel', () => {
  let tunnel: CloudflareTunnel;

  afterEach(() => {
    if (tunnel) {
      tunnel.stop();
    }
  });

  describe('constructor', () => {
    it('should initialize with port', () => {
      tunnel = new CloudflareTunnel({ port: 3000 });
      expect(tunnel).toBeDefined();
    });

    it('should not be running initially', () => {
      tunnel = new CloudflareTunnel({ port: 3000 });
      expect(tunnel.isRunning()).toBe(false);
    });

    it('should not have URL initially', () => {
      tunnel = new CloudflareTunnel({ port: 3000 });
      expect(tunnel.getUrl()).toBeNull();
    });
  });

  describe('start and stop', () => {
    it.skipIf(!hasCloudflared)('should start tunnel and return URL', async () => {
      tunnel = new CloudflareTunnel({ port: 3000 });
      const url = await tunnel.start();

      expect(url).toMatch(/https:\/\/.*\.trycloudflare\.com/);
      expect(tunnel.getUrl()).toBe(url);
      expect(tunnel.isRunning()).toBe(true);

      tunnel.stop();
      expect(tunnel.isRunning()).toBe(false);
      expect(tunnel.getUrl()).toBeNull();
    }, 35000);

    it('should handle stopping when not running', () => {
      tunnel = new CloudflareTunnel({ port: 3007 });
      tunnel.stop();
      // No error means success
    });
  });

  describe('getUrl', () => {
    it('should return null before starting', () => {
      tunnel = new CloudflareTunnel({ port: 3009 });
      expect(tunnel.getUrl()).toBeNull();
    });
  });

  describe('isRunning', () => {
    it('should return false before starting', () => {
      tunnel = new CloudflareTunnel({ port: 3012 });
      expect(tunnel.isRunning()).toBe(false);
    });
  });
});
