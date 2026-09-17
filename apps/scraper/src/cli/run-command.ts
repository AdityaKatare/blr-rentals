import { errorMessage } from '@blr/core';
import { createDb, type DbHandle } from '@blr/db';
import { loadConfig, type ScraperConfig } from '../config';
import { NotImplementedError } from '../errors';

export function reportError(err: unknown): void {
  if (err instanceof NotImplementedError) {
    console.error(err.message);
    process.exitCode = 3;
    return;
  }
  console.error(errorMessage(err));
  process.exitCode = 1;
}

export async function runCommand(work: (config: ScraperConfig) => Promise<void>): Promise<void> {
  try {
    await work(loadConfig());
  } catch (err) {
    reportError(err);
  }
}

export function withDb(work: (db: DbHandle, config: ScraperConfig) => Promise<void>): Promise<void> {
  return runCommand(async (config) => {
    const db = createDb(config.databaseUrl);
    try {
      await work(db, config);
    } finally {
      await db.close();
    }
  });
}

export function positiveInt(value: string, fallback: number): number {
  return Math.max(1, Number.parseInt(value, 10) || fallback);
}
