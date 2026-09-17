import { ListingCountCards } from '@/components/status/listing-count-cards';
import { RecentRunsTable } from '@/components/status/recent-runs-table';
import { SourcesTable } from '@/components/status/sources-table';
import { DatabaseErrorNotice } from '@/components/ui/notice';
import { loadStatus } from '@/server/status';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const status = await loadStatus();

  if ('error' in status) {
    return <DatabaseErrorNotice message={status.error} />;
  }

  return (
    <div className="space-y-8 text-sm">
      <ListingCountCards counts={status.counts} />
      <SourcesTable sources={status.sources} />
      <RecentRunsTable runs={status.runs} />
    </div>
  );
}
