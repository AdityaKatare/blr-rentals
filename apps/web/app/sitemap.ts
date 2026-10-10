import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/site';
import { loadSocietyNames } from '@/server/societies';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const societies = await loadSocietyNames();
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/societies`, changeFrequency: 'daily', priority: 0.8 },
    ...societies.map((s) => ({
      url: `${SITE_URL}/societies/${s.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
