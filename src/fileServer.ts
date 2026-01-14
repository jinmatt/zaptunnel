import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import qrcode from 'qrcode-terminal';
import { FileServer } from './server';
import { CloudflareTunnel } from './tunnel';
import { validateFile, getFileInfo, formatBytes } from './utils';

export interface ShareOptions {
  filePath: string;
  maxDownloads?: number;
  expire?: number;
  password?: string;
}

export class FileServerOrchestrator {
  private server: FileServer | null = null;
  private tunnel: CloudflareTunnel | null = null;
  private expirationTimer: NodeJS.Timeout | null = null;
  private progressBar: cliProgress.SingleBar | null = null;

  async share(options: ShareOptions): Promise<void> {
    const maxDownloads = options.maxDownloads || 1;
    const expireMinutes = options.expire || 60;

    // Validate file
    console.log(chalk.blue('🔍 Validating file...'));
    const validation = validateFile(options.filePath);

    if (!validation.valid) {
      console.error(chalk.red(`✗ ${validation.error}`));
      process.exit(1);
    }

    const filePath = validation.absolutePath!;
    const fileInfo = getFileInfo(filePath);

    console.log(chalk.green(`✓ File found: ${fileInfo.name} (${fileInfo.sizeFormatted})`));

    // Start server
    const serverSpinner = ora('Starting server...').start();
    try {
      this.server = new FileServer({
        filePath,
        password: options.password,
        port: 3000,
      });

      const port = await this.server.start();
      serverSpinner.succeed(chalk.green('Server started'));

      // Setup server event listeners
      this.setupServerListeners(maxDownloads);

      // Start tunnel
      const tunnelSpinner = ora('Creating tunnel...').start();
      this.tunnel = new CloudflareTunnel({ port });

      const tunnelUrl = await this.tunnel.start();
      tunnelSpinner.succeed(chalk.green('Tunnel created'));

      // Display info
      console.log('');
      console.log(chalk.bold.green('✓ Ready!'));
      console.log('');
      console.log(chalk.bold('📎 ' + tunnelUrl));
      console.log('');
      
      // Display QR code with left margin for easier scanning
      console.log(chalk.bold('📱 QR Code:'));
      qrcode.generate(tunnelUrl, { small: true }, (qrcode) => {
        // Add left margin (4 spaces) to each line for better scanning
        const lines = qrcode.split('\n');
        const margin = '    ';
        const qrcodeWithMargin = lines.map(line => margin + line).join('\n');
        console.log(qrcodeWithMargin);
      });
      
      console.log(
        chalk.gray(
          `⚙️  Max downloads: ${maxDownloads} | Expires: ${expireMinutes}min${
            options.password ? ' | Password protected' : ''
          }`
        )
      );
      console.log('');
      console.log(chalk.yellow('⏳ Waiting for download...'));

      // Setup expiration timer
      this.setupExpirationTimer(expireMinutes);

      // Handle process termination
      this.setupCleanup();
    } catch (error) {
      serverSpinner.fail(chalk.red('Failed to start'));
      console.error(chalk.red((error as Error).message));
      await this.cleanup();
      process.exit(1);
    }
  }

  private setupServerListeners(maxDownloads: number): void {
    if (!this.server) return;

    this.server.on('downloadStarted', () => {
      console.log('');
      console.log(chalk.blue('📥 Download started...'));

      // Create progress bar
      this.progressBar = new cliProgress.SingleBar(
        {
          format: chalk.cyan('{bar}') + ' {percentage}% | {downloaded}/{total}',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true,
        },
        cliProgress.Presets.shades_classic
      );
    });

    this.server.on('downloadProgress', (data: any) => {
      if (!this.progressBar) {
        this.progressBar = new cliProgress.SingleBar(
          {
            format: chalk.cyan('{bar}') + ' {percentage}% | {downloaded}/{total}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
          },
          cliProgress.Presets.shades_classic
        );
        this.progressBar.start(data.total, 0, {
          downloaded: formatBytes(0),
          total: formatBytes(data.total),
        });
      }

      this.progressBar.update(data.downloaded, {
        downloaded: formatBytes(data.downloaded),
        total: formatBytes(data.total),
      });
    });

    this.server.on('downloadComplete', async (data: any) => {
      if (this.progressBar) {
        this.progressBar.stop();
        this.progressBar = null;
      }

      console.log(chalk.green(`✓ Download complete! (${data.count}/${maxDownloads})`));

      if (data.count >= maxDownloads) {
        console.log('');
        console.log(chalk.yellow('Maximum downloads reached. Shutting down...'));
        await this.cleanup();
        process.exit(0);
      } else {
        console.log('');
        console.log(chalk.yellow('⏳ Waiting for next download...'));
      }
    });

    this.server.on('downloadError', async (error: Error) => {
      if (this.progressBar) {
        this.progressBar.stop();
        this.progressBar = null;
      }
      console.error(chalk.red(`✗ Download error: ${error.message}`));
    });
  }

  private setupExpirationTimer(minutes: number): void {
    this.expirationTimer = setTimeout(async () => {
      console.log('');
      console.log(chalk.yellow('⏱️  Expiration time reached. Shutting down...'));
      await this.cleanup();
      process.exit(0);
    }, minutes * 60 * 1000);
  }

  private setupCleanup(): void {
    const cleanup = async () => {
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private async cleanup(): Promise<void> {
    if (this.progressBar) {
      this.progressBar.stop();
    }

    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
    }

    if (this.tunnel) {
      this.tunnel.stop();
    }

    if (this.server) {
      await this.server.stop();
    }

    console.log(chalk.gray('👋 Shutdown complete'));
  }
}
