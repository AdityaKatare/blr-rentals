import type { ListedBy } from './enums';

export const DEPOSIT_MIN_PLAUSIBLE_MONTHS = 0.5;
export const DEPOSIT_MAX_PLAUSIBLE_MONTHS = 18;

export interface MoveInInput {
  rent: number;
  deposit: number | null;
  maintenance: number | null;
  listedBy: ListedBy;
}

export interface MoveInCost {
  total: number;
  rent: number;
  deposit: number;
  maintenance: number;
  brokerage: number;
}

export function isPlausibleDeposit(rent: number, deposit: number | null): boolean {
  if (deposit === null || deposit <= 0 || rent <= 0) return false;
  const months = deposit / rent;
  return months >= DEPOSIT_MIN_PLAUSIBLE_MONTHS && months <= DEPOSIT_MAX_PLAUSIBLE_MONTHS;
}

export function depositMonths(rent: number, deposit: number | null): number | null {
  if (!isPlausibleDeposit(rent, deposit)) return null;
  return Math.round((deposit! / rent) * 2) / 2;
}

export function moveInCost(l: MoveInInput): MoveInCost | null {
  if (!isPlausibleDeposit(l.rent, l.deposit)) return null;
  const maintenance = l.maintenance ?? 0;
  const brokerage = l.listedBy === 'broker' ? l.rent : 0;
  return {
    total: l.rent + l.deposit! + maintenance + brokerage,
    rent: l.rent,
    deposit: l.deposit!,
    maintenance,
    brokerage,
  };
}
