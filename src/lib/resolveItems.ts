import type { Scenario, Debt, Purchase, Raise } from './types';

export interface LibraryData {
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
  return { ...scenario, debts, purchases, raises };
}
