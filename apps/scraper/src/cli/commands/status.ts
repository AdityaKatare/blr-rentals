import { recentRuns } from '@blr/db';
import type { Command } from 'commander';
import { positiveInt, withDb } from '../run-command';

const DEFAULT_LIMIT = 20;

interface StatusOptions {
  limit: string;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show recent scrape runs')
    .option('--limit <n>', 'number of rows', String(DEFAULT_LIMIT))
    .action((options: StatusOptions) =>
      withDb(async (db) => {
        const runs = await recentRuns(db.sql, positiveInt(options.limit, DEFAULT_LIMIT));
        if (runs.length === 0) console.log('no runs yet');
        else console.table(runs);
      }),
    );
}
