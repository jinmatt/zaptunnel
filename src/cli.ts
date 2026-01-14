#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { FileServerOrchestrator } from './fileServer';
import { parseExpiration } from './utils';

const program = new Command();

program
  .name('zaptunnel')
  .description('A CLI tool that instantly shares files by generating temporary public URLs')
  .version('1.0.0');

program
  .command('share')
  .description('Share a file via temporary public URL')
  .argument('<file>', 'Path to the file to share')
  .option('-m, --max-downloads <number>', 'Maximum number of downloads before shutdown', '1')
  .option('-e, --expire <minutes>', 'Auto-shutdown timer in minutes', '60')
  .option('-p, --password <password>', 'Password protect the file')
  .action(async (file: string, options: any) => {
    try {
      const maxDownloads = parseInt(options.maxDownloads, 10);
      if (isNaN(maxDownloads) || maxDownloads < 1) {
        console.error(chalk.red('✗ Invalid max-downloads value. Must be a positive number.'));
        process.exit(1);
      }

      const expire = parseExpiration(options.expire);

      const orchestrator = new FileServerOrchestrator();
      await orchestrator.share({
        filePath: file,
        maxDownloads,
        expire,
        password: options.password,
      });
    } catch (error) {
      console.error(chalk.red('✗ Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);
