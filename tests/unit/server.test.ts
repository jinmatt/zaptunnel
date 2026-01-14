import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileServer } from '../../src/server';
import { getFixturePath, waitForEvent } from '../helpers/test-utils';
import request from 'supertest';
import bcrypt from 'bcrypt';

describe('FileServer', () => {
  let server: FileServer;
  const testFile = getFixturePath('small-file.txt');

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('constructor', () => {
    it('should initialize with file path', () => {
      server = new FileServer({ filePath: testFile });
      expect(server).toBeDefined();
    });

    it('should initialize with password', () => {
      server = new FileServer({
        filePath: testFile,
        password: 'testpass',
      });
      expect(server).toBeDefined();
    });

    it('should initialize with custom port', () => {
      server = new FileServer({
        filePath: testFile,
        port: 4000,
      });
      expect(server).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start server on specified port', async () => {
      server = new FileServer({ filePath: testFile, port: 3001 });
      const port = await server.start();
      expect(port).toBe(3001);
    });

    it('should handle port conflicts by trying next port', async () => {
      // Start first server
      const server1 = new FileServer({ filePath: testFile, port: 3002 });
      await server1.start();

      // Try to start second server on same port
      server = new FileServer({ filePath: testFile, port: 3002 });
      const port = await server.start();
      expect(port).toBe(3003); // Should use next port

      await server1.stop();
    });
  });

  describe('stop', () => {
    it('should stop running server', async () => {
      server = new FileServer({ filePath: testFile, port: 3003 });
      await server.start();
      await server.stop();
      // No error means success
    });

    it('should handle stopping when not running', async () => {
      server = new FileServer({ filePath: testFile });
      await server.stop();
      // No error means success
    });
  });

  describe('GET /', () => {
    beforeEach(async () => {
      server = new FileServer({ filePath: testFile, port: 3004 });
      await server.start();
    });

    it('should return preview page', async () => {
      const response = await request(server['app']).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('small-file.txt');
    });

    it('should show file size', async () => {
      const response = await request(server['app']).get('/');
      expect(response.text).toMatch(/\d+(\.\d+)?\s+[KMGT]?B/);
    });

    it('should indicate no password when not protected', async () => {
      const response = await request(server['app']).get('/');
      expect(response.text).toContain('false');
    });

    it('should indicate password protection when enabled', async () => {
      await server.stop();
      server = new FileServer({
        filePath: testFile,
        password: 'testpass',
        port: 3005,
      });
      await server.start();

      const response = await request(server['app']).get('/');
      expect(response.text).toContain('true');
    });
  });

  describe('GET /download', () => {
    beforeEach(async () => {
      server = new FileServer({ filePath: testFile, port: 3006 });
      await server.start();
    });

    it('should download file without password', async () => {
      const response = await request(server['app']).get('/download');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('small-file.txt');
    });

    it('should include content-length header', async () => {
      const response = await request(server['app']).get('/download');
      expect(response.headers['content-length']).toBeDefined();
    });

    it('should return file content', async () => {
      const response = await request(server['app']).get('/download');
      const content = response.body.toString();
      expect(content).toContain('small test file');
    });
  });

  describe('GET /download with password', () => {
    const password = 'secret123';

    beforeEach(async () => {
      server = new FileServer({
        filePath: testFile,
        password,
        port: 3007,
      });
      await server.start();
    });

    it('should reject download without password', async () => {
      const response = await request(server['app']).get('/download');
      expect(response.status).toBe(401);
      expect(response.text).toContain('Password required');
    });

    it('should reject download with wrong password', async () => {
      const response = await request(server['app'])
        .get('/download')
        .query({ password: 'wrongpass' });
      expect(response.status).toBe(401);
      expect(response.text).toContain('Invalid password');
    });

    it('should allow download with correct password', async () => {
      const response = await request(server['app'])
        .get('/download')
        .query({ password });
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
    });
  });

  describe('events', () => {
    beforeEach(async () => {
      server = new FileServer({ filePath: testFile, port: 3008 });
      await server.start();
    });

    it('should emit downloadStarted event', async () => {
      const eventPromise = waitForEvent(server, 'downloadStarted');
      request(server['app']).get('/download').end(() => {});
      await eventPromise;
      // Success if no timeout
    });

    it('should emit downloadProgress event', async () => {
      const eventPromise = waitForEvent(server, 'downloadProgress');
      request(server['app']).get('/download').end(() => {});
      const data = await eventPromise;
      expect(data).toHaveProperty('downloaded');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('progress');
    });

    it('should emit downloadComplete event', async () => {
      const eventPromise = waitForEvent(server, 'downloadComplete');
      await request(server['app']).get('/download');
      const data = await eventPromise;
      expect(data).toHaveProperty('downloaded');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('count');
      expect(data.count).toBe(1);
    });

    it('should track download count', async () => {
      expect(server.getDownloadCount()).toBe(0);
      await request(server['app']).get('/download');
      expect(server.getDownloadCount()).toBe(1);
      await request(server['app']).get('/download');
      expect(server.getDownloadCount()).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle missing template file gracefully', async () => {
      server = new FileServer({ filePath: testFile, port: 3009 });
      await server.start();
      
      // Mock template file not found by temporarily changing the path
      const originalReadFileSync = require('fs').readFileSync;
      vi.spyOn(require('fs'), 'readFileSync').mockImplementation((path: string) => {
        if (path.includes('preview.html')) {
          throw new Error('Template not found');
        }
        return originalReadFileSync(path);
      });

      const response = await request(server['app']).get('/');
      expect(response.status).toBe(500);

      vi.restoreAllMocks();
    });
  });
});
