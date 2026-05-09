import { useMemo } from 'react';
import { simulate } from '../lib/simulate';
import { RETURN_RATES } from '../lib/constants';
import type { Scenario, SimRow } from '../lib/types';

export function useSimulation(scenario: Scenario): SimRow[] {
  const returnRate = RETURN_RATES[scenario.returnMode] ?? 0;
  return useMemo(
    () => simulate(scenario, returnRate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(scenario), returnRate],
  );
}
