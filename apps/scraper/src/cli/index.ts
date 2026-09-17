#!/usr/bin/env node
import { Command } from 'commander';
import { registerDedupeCommand } from './commands/dedupe';
import { registerMarkStaleCommand } from './commands/mark-stale';
import { registerScrapeCommand } from './commands/scrape';
import { registerStatusCommand } from './commands/status';
import { reportError } from './run-command';

const program = new Command();
program
  .name('blr-scraper')
  .description('Collects Bangalore rental listings from enabled sources into Postgres.')
  .version('0.1.0');

registerScrapeCommand(program);
registerStatusCommand(program);
registerMarkStaleCommand(program);
registerDedupeCommand(program);

program.parseAsync(process.argv).catch(reportError);
