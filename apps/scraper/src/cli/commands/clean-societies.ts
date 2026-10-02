import { loadSeedLocalities, renameSocieties, storedSocietyNames } from '@blr/db';
import type { Command } from 'commander';
import { placeNames, societyName } from '../../sources/shared/society';
import { withDb } from '../run-command';

const SOCIETY_FIELDS = { nobroker: 'society', magicbricks: 'prjname' } as const;

export function registerCleanSocietiesCommand(program: Command): void {
  program
    .command('clean-societies')
    .description('Re-derive stored society names from the raw listings with the current rules')
    .option('--dry-run', 'print the changes without writing them', false)
    .action((options: { dryRun: boolean }) =>
      withDb(async (db) => {
        const places = placeNames(await loadSeedLocalities());
        for (const [source, field] of Object.entries(SOCIETY_FIELDS) as [keyof typeof SOCIETY_FIELDS, string][]) {
          const renames = (await storedSocietyNames(db.sql, source, field))
            .map((row) => ({ ...row, name: societyName(row.given, places) }))
            .filter((row) => row.name !== row.current);
          if (options.dryRun) {
            for (const r of renames) console.log(`${source}  ${JSON.stringify(r.current)} -> ${JSON.stringify(r.name)}`);
          }
          const updated = options.dryRun ? 0 : await renameSocieties(db.sql, renames.map(({ id, name }) => ({ id, name })));
          console.log({ source, changed: renames.length, updated });
        }
      }),
    );
}
