import { AMENITIES, type Amenity } from '../enums';

/**
 * Source label/code → canonical token. Keys are lower-cased and normalised
 * (underscores/hyphens → spaces) before lookup. NoBroker's short codes
 * (CPA, PB, VP, …) are included.
 */
const ALIASES: Record<string, Amenity> = {
  lift: 'lift',
  elevator: 'lift',
  gym: 'gym',
  gymnasium: 'gym',
  'fitness centre': 'gym',
  pool: 'pool',
  'swimming pool': 'pool',
  swimmingpool: 'pool',
  pb: 'power_backup',
  'power backup': 'power_backup',
  powerbackup: 'power_backup',
  generator: 'power_backup',
  security: 'security',
  '24x7 security': 'security',
  'security personnel': 'security',
  park: 'park',
  garden: 'park',
  cpa: 'park',
  'children play area': 'park',
  "children's play area": 'park',
  club: 'clubhouse',
  clubhouse: 'clubhouse',
  'club house': 'clubhouse',
  gp: 'gated',
  gated: 'gated',
  'gated community': 'gated',
  'gated society': 'gated',
  intercom: 'intercom',
  rwh: 'rainwater_harvesting',
  'rain water harvesting': 'rainwater_harvesting',
  'rainwater harvesting': 'rainwater_harvesting',
  stp: 'stp',
  'sewage treatment plant': 'stp',
  internet: 'wifi',
  wifi: 'wifi',
  'wi fi': 'wifi',
  broadband: 'wifi',
  servant: 'servant_room',
  'servant room': 'servant_room',
  'maid room': 'servant_room',
  ac: 'ac',
  'air conditioner': 'ac',
  'air conditioning': 'ac',
  vp: 'visitor_parking',
  'visitor parking': 'visitor_parking',
  fs: 'fire_safety',
  'fire safety': 'fire_safety',
  'fire alarm': 'fire_safety',
  sc: 'shopping_centre',
  'shopping center': 'shopping_centre',
  'shopping centre': 'shopping_centre',
  hk: 'house_keeping',
  'house keeping': 'house_keeping',
  housekeeping: 'house_keeping',
  'pet friendly': 'pet_friendly',
  'pets allowed': 'pet_friendly',
};

const CANONICAL = new Set<string>(AMENITIES);

function key(label: string): string {
  return label.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

/** Map a list of source labels/codes to sorted, de-duplicated canonical amenities. Unknown labels are dropped. */
export function normalizeAmenities(labels: Iterable<string>): Amenity[] {
  const out = new Set<Amenity>();
  for (const raw of labels) {
    const k = key(raw);
    const snake = k.replace(/ /g, '_');
    const hit = ALIASES[k] ?? ALIASES[k.replace(/ /g, '')] ?? (CANONICAL.has(snake) ? (snake as Amenity) : undefined);
    if (hit) out.add(hit);
  }
  return [...out].sort();
}

/** Convenience for sources that expose amenities as a flag map ({ LIFT: true, GYM: false }). */
export function amenitiesFromFlags(flags: Record<string, unknown>): Amenity[] {
  return normalizeAmenities(
    Object.entries(flags)
      .filter(([, v]) => v === true || v === 'true' || v === 'Y')
      .map(([k]) => k),
  );
}
