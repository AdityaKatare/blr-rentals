import { refreshSocieties } from '@blr/db';
import type { Command } from 'commander';
import { withDb } from '../run-command';

export function registerSocietiesCommand(program: Command): void {
  program
    .command('societies')
    .description('Rebuild the known societies from the active listings')
    .action(() =>
      withDb(async (db) => {
        console.log({ societies: await refreshSocieties(db.sql) });
      }),
    );
}
