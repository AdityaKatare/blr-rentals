import { PageHeadline, PageShell } from '@/components/layout/page';
import { ListingCountCards } from '@/components/status/listing-count-cards';
import { RecentRunsTable } from '@/components/status/recent-runs-table';
import { SourcesTable } from '@/components/status/sources-table';
import { DatabaseErrorNotice } from '@/components/ui/notice';
import { loadStatus } from '@/server/status';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Status' };

export default async function StatusPage() {
  const status = await loadStatus();

  return (
    <PageShell>
      <PageHeadline title="Status">
        <p className="mt-2 text-[13px] text-second">What the scraper has collected and how its last runs went.</p>
      </PageHeadline>

      {'error' in status ? (
        <div className="py-6">
          <DatabaseErrorNotice message={status.error} />
        </div>
      ) : (
        <div className="flex flex-col gap-8 py-6">
          <ListingCountCards counts={status.counts} />
          <SourcesTable sources={status.sources} />
          <RecentRunsTable runs={status.runs} />
        </div>
      )}
    </PageShell>
  );
}
