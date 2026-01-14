import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TunnelOptions {
  port: number;
}

export class CloudflareTunnel extends EventEmitter {
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;

  constructor(private options: TunnelOptions) {
    super();
  }

  /**
   * Starts the Cloudflare tunnel
   */
  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Spawn cloudflared process with quick tunnel
        this.process = spawn('cloudflared', [
          'tunnel',
          '--url',
          `http://localhost:${this.options.port}`,
        ]);

        let stderr = '';

        const parseForUrl = (output: string) => {
          // Look for the tunnel URL in the output
          const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
          if (urlMatch && !this.tunnelUrl) {
            this.tunnelUrl = urlMatch[0];
            resolve(this.tunnelUrl);
          }
        };

        // Parse stdout for tunnel URL
        this.process.stdout?.on('data', (data: Buffer) => {
          parseForUrl(data.toString());
        });

        // Parse stderr for tunnel URL (cloudflared outputs URL here)
        this.process.stderr?.on('data', (data: Buffer) => {
          const output = data.toString();
          stderr += output;
          parseForUrl(output);
        });

        // Handle process errors
        this.process.on('error', (error: Error) => {
          reject(new Error(`Failed to start cloudflared: ${error.message}`));
        });

        // Handle process exit
        this.process.on('exit', (code: number | null) => {
          if (code !== 0 && !this.tunnelUrl) {
            reject(new Error(`cloudflared exited with code ${code}${stderr ? ': ' + stderr : ''}`));
          }
          this.emit('exit', code);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!this.tunnelUrl) {
            this.stop();
            reject(new Error('Timeout waiting for tunnel URL. Make sure cloudflared is installed.'));
          }
        }, 30000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the tunnel
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.tunnelUrl = null;
    }
  }

  /**
   * Gets the current tunnel URL
   */
  getUrl(): string | null {
    return this.tunnelUrl;
  }

  /**
   * Checks if tunnel is running
   */
  isRunning(): boolean {
    return this.process !== null && this.tunnelUrl !== null;
  }
}
