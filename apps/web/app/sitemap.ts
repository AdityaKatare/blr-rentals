import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/site';
import { loadAreaSlugs } from '@/server/areas';
import { loadSocietyNames } from '@/server/societies';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, societies] = await Promise.all([loadAreaSlugs(), loadSocietyNames()]);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/societies`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/how-it-works`, lastModified: '2026-11-02', changeFrequency: 'monthly', priority: 0.7 },
    ...areas.map((slug) => ({
      url: `${SITE_URL}/areas/${slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...societies.map((s) => ({
      url: `${SITE_URL}/societies/${s.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
