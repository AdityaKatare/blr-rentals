export const POI_CATEGORIES = [
  'tech_park',
  'metro',
  'railway_station',
  'bus_stop',
  'airport',
  'major_road',
  'school',
  'college',
  'hospital',
  'mall',
  'supermarket',
  'restaurant',
  'gym',
  'park',
] as const;
export type PoiCategory = (typeof POI_CATEGORIES)[number];

export const POI_CATEGORY_GROUPS = ['work', 'transit', 'education_health', 'daily'] as const;
export type PoiCategoryGroup = (typeof POI_CATEGORY_GROUPS)[number];

export interface PoiCategorySpec {
  group: PoiCategoryGroup;
  radiiM: readonly number[];
}

export const POI_CATEGORY_SPECS: Record<PoiCategory, PoiCategorySpec> = {
  tech_park: { group: 'work', radiiM: [2000, 3000, 5000, 8000, 10000] },
  metro: { group: 'transit', radiiM: [500, 1000, 1500, 2000] },
  railway_station: { group: 'transit', radiiM: [1000, 2000, 3000, 5000] },
  bus_stop: { group: 'transit', radiiM: [250, 500, 1000] },
  airport: { group: 'transit', radiiM: [10000, 20000, 30000] },
  major_road: { group: 'transit', radiiM: [500, 1000, 2000] },
  school: { group: 'education_health', radiiM: [1000, 2000, 3000, 5000] },
  college: { group: 'education_health', radiiM: [1000, 2000, 3000, 5000] },
  hospital: { group: 'education_health', radiiM: [1000, 2000, 3000, 5000] },
  mall: { group: 'daily', radiiM: [1000, 2000, 3000, 5000] },
  supermarket: { group: 'daily', radiiM: [500, 1000, 2000] },
  restaurant: { group: 'daily', radiiM: [500, 1000, 2000] },
  gym: { group: 'daily', radiiM: [500, 1000, 2000] },
  park: { group: 'daily', radiiM: [500, 1000, 2000] },
};

export const NEAR_MIN_M = 100;
export const NEAR_MAX_M = 30000;
export const CENTROID_NEAR_MIN_M = 3000;

export const isPoiCategory = (v: string): v is PoiCategory => (POI_CATEGORIES as readonly string[]).includes(v);

export const centroidCanMatch = (withinM: number): boolean => withinM >= CENTROID_NEAR_MIN_M;
