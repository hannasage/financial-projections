import type { Scenario, Debt, Purchase, Raise } from './types';
import type { Profile } from '../stores/libraryStore';
import { getTodayStartDate } from './constants';

export interface LibraryData {
  profile?:  Profile;
  debts:     Debt[];
  purchases: Purchase[];
  raises:    Raise[];
}

export function resolveItems(scenario: Scenario, library: LibraryData): LibraryData {
  const exclD = new Set(scenario.excludedDebtIds     ?? []);
  const exclP = new Set(scenario.excludedPurchaseIds ?? []);
  const exclR = new Set(scenario.excludedRaiseIds    ?? []);
  return {
    debts:     [...library.debts.filter(d => !exclD.has(d.id)),     ...(scenario.debts     ?? [])],
    purchases: [...library.purchases.filter(p => !exclP.has(p.id)), ...(scenario.purchases ?? [])],
    raises:    [...library.raises.filter(r => !exclR.has(r.id)),     ...(scenario.raises    ?? [])],
  };
}

export function mergeIntoScenario(scenario: Scenario, library: LibraryData): Scenario {
  const { debts, purchases, raises } = resolveItems(scenario, library);
  const profile = library.profile;
  const today = getTodayStartDate();
  const fromScenarioYear = Number((scenario as { startYear?: number }).startYear);
  const fromScenarioMonth = Number((scenario as { startMonthIdx?: number }).startMonthIdx);
  const fromProfileYear = Number(profile?.startYear);
  const fromProfileMonth = Number(profile?.startMonthIdx);
  const startYear = Number.isFinite(fromScenarioYear)
    ? fromScenarioYear
    : Number.isFinite(fromProfileYear)
      ? fromProfileYear
      : today.startYear;
  const startMonthIdxRaw = Number.isFinite(fromScenarioMonth)
    ? fromScenarioMonth
    : Number.isFinite(fromProfileMonth)
      ? fromProfileMonth
      : today.startMonthIdx;
  const startMonthIdx = Math.max(0, Math.min(11, startMonthIdxRaw));

  return {
    ...scenario,
    startYear,
    startMonthIdx,
    ...(profile ? {
      envelope: profile.envelope,
      startSavings: profile.startSavings,
      startAge: profile.startAge,
      horizonYears: profile.horizonYears,
      returnMode: profile.returnMode,
      hysaRate: profile.hysaRate,
      taxPct: profile.taxPct,
      baseSalary: profile.baseSalary,
      housingCost: profile.housingCost,
    } : {}),
    debts,
    purchases,
    raises,
  };
}
