import { useMemo } from 'react';
import { simulate } from '../lib/simulate';
import { getReturnRate } from '../lib/finance';
import { useLibraryStore } from '../stores/libraryStore';
import { mergeIntoScenario } from '../lib/resolveItems';
import type { Scenario, SimRow } from '../lib/types';

export function useSimulation(scenario: Scenario): SimRow[] {
  const library = useLibraryStore();
  return useMemo(
    () => {
      const resolved = mergeIntoScenario(scenario, library);
      return simulate(resolved, getReturnRate(resolved));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(scenario), JSON.stringify({ d: library.debts, p: library.purchases, r: library.raises })],
  );
}
