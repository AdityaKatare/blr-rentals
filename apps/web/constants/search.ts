export const RADIUS_OPTIONS_KM = [1, 2, 3, 5, 8, 10, 15];

export const BHK_OPTIONS = [
  { value: '0', label: '1 RK' },
  { value: '1', label: '1 BHK' },
  { value: '2', label: '2 BHK' },
  { value: '3', label: '3 BHK' },
  { value: '4', label: '4+ BHK' },
];

export const LARGEST_BHK_OPTION = 4;
export const MAX_SEARCH_BEDROOMS = 10;

export const FILTERS_KEPT_ON_CLEAR = ['locality', 'lat', 'lng', 'radiusKm', 'sort'];

export const NEW_LISTING_DAYS = 3;

export const STATUS_RECENT_RUNS = 30;

export const NEARBY_FILTER_NOTE =
  'Nearby distances are straight lines, measured to the edge of large places such as tech parks and parks. Listings placed only at their locality centre count only for distances of 3 km or more.';

export const NEARBY_CARD_LIMIT = 3;

export const DEPOSIT_FILTER_NOTE =
  'Deposit in months is the published deposit divided by the rent. Listings with no deposit, or one too far off the rent to believe, are left out.';
