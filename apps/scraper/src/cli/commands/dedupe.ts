import { dedupeListings } from '@blr/db';
import type { Command } from 'commander';
import { withDb } from '../run-command';

export function registerDedupeCommand(program: Command): void {
  program
    .command('dedupe')
    .description('Group all active listings that describe the same property')
    .action(() =>
      withDb(async (db) => {
        console.log(await dedupeListings(db.sql));
      }),
    );
}
