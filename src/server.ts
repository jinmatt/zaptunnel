import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import bcrypt from 'bcrypt';
import { getFileInfo } from './utils';

export interface ServerOptions {
  filePath: string;
  password?: string;
  port?: number;
}

export class FileServer extends EventEmitter {
  private app: express.Application;
  private server: any;
  private filePath: string;
  private passwordHash?: string;
  private port: number;
  private downloadCount: number = 0;

  constructor(options: ServerOptions) {
    super();
    this.app = express();
    this.filePath = options.filePath;
    this.port = options.port || 3000;

    if (options.password) {
      this.passwordHash = bcrypt.hashSync(options.password, 10);
    }

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Serve preview page
    this.app.get('/', (req: Request, res: Response) => {
      try {
        const templatePath = path.join(__dirname, '..', 'templates', 'preview.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const fileInfo = getFileInfo(this.filePath);

        // Replace template variables
        html = html.replace('{{FILE_NAME}}', fileInfo.name);
        html = html.replace('{{FILE_SIZE}}', fileInfo.sizeFormatted);
        html = html.replace(/\{\{PASSWORD_PROTECTED\}\}/g, this.passwordHash ? 'true' : 'false');
        html = html.replace(/\{\{#if PASSWORD_PROTECTED\}\}/g, this.passwordHash ? '' : '<!--');
        html = html.replace(/\{\{\/if\}\}/g, this.passwordHash ? '' : '-->');

        res.send(html);
      } catch (error) {
        res.status(500).send('Error loading page');
      }
    });

    // Handle file download
    this.app.get('/download', async (req: Request, res: Response) => {
      try {
        // Check password if required
        if (this.passwordHash) {
          const password = req.query.password as string;

          if (!password) {
            res.status(401).send('Password required');
            return;
          }

          const isValid = await bcrypt.compare(password, this.passwordHash);
          if (!isValid) {
            res.status(401).send('Invalid password');
            return;
          }
        }

        const fileInfo = getFileInfo(this.filePath);
        const fileStream = fs.createReadStream(this.filePath);

        // Set headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);
        res.setHeader('Content-Length', fileInfo.size);

        let downloadedBytes = 0;

        // Emit download started
        this.emit('downloadStarted');

        // Track progress
        fileStream.on('data', (chunk: string | Buffer) => {
          downloadedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
          const progress = (downloadedBytes / fileInfo.size) * 100;
          this.emit('downloadProgress', {
            downloaded: downloadedBytes,
            total: fileInfo.size,
            progress: progress,
          });
        });

        // Handle stream completion
        fileStream.on('end', () => {
          this.downloadCount++;
          this.emit('downloadComplete', {
            downloaded: downloadedBytes,
            total: fileInfo.size,
            count: this.downloadCount,
          });
        });

        // Handle errors
        fileStream.on('error', (error: Error) => {
          this.emit('downloadError', error);
          if (!res.headersSent) {
            res.status(500).send('Error downloading file');
          }
        });

        // Pipe the file to response
        fileStream.pipe(res);
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).send('Error downloading file');
        }
      }
    });
  }

  /**
   * Starts the server
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          resolve(this.port);
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            // Try next port
            this.port++;
            this.server = this.app.listen(this.port, () => {
              resolve(this.port);
            });
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Gets download count
   */
  getDownloadCount(): number {
    return this.downloadCount;
  }
}
