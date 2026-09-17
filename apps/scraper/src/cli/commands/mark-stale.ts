import { DEFAULT_REMOVE_DAYS, DEFAULT_STALE_DAYS, markStale } from '@blr/db';
import type { Command } from 'commander';
import { getAdapter } from '../../sources/registry';
import { withDb } from '../run-command';

interface MarkStaleOptions {
  source: string;
  staleDays: string;
  removeDays: string;
}

export function registerMarkStaleCommand(program: Command): void {
  program
    .command('mark-stale')
    .description('Transition listings active → stale → removed for a source')
    .requiredOption('--source <slug>')
    .option('--stale-days <n>', 'days without being seen or updated before a listing is hidden', String(DEFAULT_STALE_DAYS))
    .option('--remove-days <n>', 'days without being seen or updated before a listing is removed', String(DEFAULT_REMOVE_DAYS))
    .action((options: MarkStaleOptions) =>
      withDb(async (db) => {
        const adapter = getAdapter(options.source);
        const summary = await markStale(db.sql, {
          source: adapter.slug,
          staleAfterDays: Number(options.staleDays),
          removeAfterDays: Number(options.removeDays),
        });
        console.log(summary);
      }),
    );
}
