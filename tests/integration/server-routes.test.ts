import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { FileServer } from '../../src/server';
import { getFixturePath, waitForEvent } from '../helpers/test-utils';
import request from 'supertest';
import express from 'express';

describe('Server Routes Integration', () => {
  let server: FileServer;
  let app: express.Application;
  const testFile = getFixturePath('small-file.txt');

  beforeEach(async () => {
    server = new FileServer({ filePath: testFile, port: 3100 });
    await server.start();
    app = server['app'];
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Preview page workflow', () => {
    it('should display file information on preview page', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('small-file.txt');
      expect(response.text).toMatch(/\d+(\.\d+)?\s+[KMGT]?B/);
    });

    it('should show download button', async () => {
      const response = await request(app).get('/');
      
      expect(response.text).toContain('download');
    });

    it('should not show password field when not protected', async () => {
      const response = await request(app).get('/');
      
      expect(response.text).toContain('passwordProtected = false');
    });
  });

  describe('Download workflow', () => {
    it('should complete full download flow', async () => {
      // Verify file can be downloaded
      const response = await request(app).get('/download');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.body).toBeDefined();
    });

    it('should emit events during download', async () => {
      const startedPromise = waitForEvent(server, 'downloadStarted');
      const progressPromise = waitForEvent(server, 'downloadProgress');
      const completePromise = waitForEvent(server, 'downloadComplete');

      // Trigger download
      await request(app).get('/download');

      // Wait for events
      await startedPromise;
      const progressData = await progressPromise;
      const completeData = await completePromise;

      expect(progressData).toHaveProperty('downloaded');
      expect(progressData).toHaveProperty('total');
      expect(progressData).toHaveProperty('progress');
      
      expect(completeData).toHaveProperty('count');
      expect(completeData.count).toBe(1);
    });

    it('should track multiple downloads', async () => {
      // First download
      await request(app).get('/download');
      expect(server.getDownloadCount()).toBe(1);

      // Second download
      await request(app).get('/download');
      expect(server.getDownloadCount()).toBe(2);

      // Third download
      await request(app).get('/download');
      expect(server.getDownloadCount()).toBe(3);
    });

    it('should send correct content headers', async () => {
      const response = await request(app).get('/download');
      
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('small-file.txt');
      expect(response.headers['content-length']).toBeDefined();
      expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
    });
  });

  describe('Password protection workflow', () => {
    beforeEach(async () => {
      await server.stop();
      server = new FileServer({
        filePath: testFile,
        password: 'secret123',
        port: 3101,
      });
      await server.start();
      app = server['app'];
    });

    it('should show password protected status on preview', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('passwordProtected = true');
    });

    it('should require password for download', async () => {
      const response = await request(app).get('/download');
      
      expect(response.status).toBe(401);
      expect(response.text).toContain('Password required');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .get('/download')
        .query({ password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
      expect(response.text).toContain('Invalid password');
    });

    it('should allow download with correct password', async () => {
      const response = await request(app)
        .get('/download')
        .query({ password: 'secret123' });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
    });

    it('should emit events even with password', async () => {
      const completePromise = waitForEvent(server, 'downloadComplete');
      
      await request(app)
        .get('/download')
        .query({ password: 'secret123' });
      
      const data = await completePromise;
      expect(data.count).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app).get('/nonexistent');
      
      expect(response.status).toBe(404);
    });

    it('should handle invalid query parameters', async () => {
      await server.stop();
      server = new FileServer({
        filePath: testFile,
        password: 'test',
        port: 3102,
      });
      await server.start();
      app = server['app'];

      const response = await request(app)
        .get('/download')
        .query({ password: '' });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Concurrent downloads', () => {
    it('should handle multiple simultaneous downloads', async () => {
      const downloads = [
        request(app).get('/download'),
        request(app).get('/download'),
        request(app).get('/download'),
      ];

      const responses = await Promise.all(downloads);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(server.getDownloadCount()).toBe(3);
    });
  });

  describe('Large file handling', () => {
    let largeFileServer: FileServer;

    beforeEach(async () => {
      const largeFile = getFixturePath('medium-file.bin');
      largeFileServer = new FileServer({ filePath: largeFile, port: 3103 });
      await largeFileServer.start();
    });

    afterEach(async () => {
      await largeFileServer.stop();
    });

    it('should stream large file', async () => {
      const response = await request(largeFileServer['app']).get('/download');
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-length']).toBeDefined();
      const size = parseInt(response.headers['content-length']);
      expect(size).toBeGreaterThan(1000000); // Should be ~5MB
    });

    it('should emit progress for large files', async () => {
      const progressEvents: any[] = [];
      
      largeFileServer.on('downloadProgress', (data) => {
        progressEvents.push(data);
      });

      await request(largeFileServer['app']).get('/download');

      expect(progressEvents.length).toBeGreaterThan(1);
      
      // Check progress increases
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i].downloaded).toBeGreaterThanOrEqual(
          progressEvents[i - 1].downloaded
        );
      }
    });
  });
});
