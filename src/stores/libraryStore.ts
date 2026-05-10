import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Debt, Purchase, Raise, Scenario } from '../lib/types';
import { getTodayStartDate } from '../lib/constants';

export type Profile = Pick<Scenario,
  'startMonthIdx' | 'startYear' | 'envelope' | 'startSavings' | 'startAge' | 'horizonYears' |
  'returnMode' | 'hysaRate' | 'taxPct' | 'baseSalary' | 'housingCost'
>;

const today = getTodayStartDate();
const DEFAULT_PROFILE: Profile = {
  startMonthIdx: today.startMonthIdx,
  startYear: today.startYear,
  envelope: 1_000, startSavings: 0, startAge: 30, horizonYears: 10,
  returnMode: 'hysa', hysaRate: 4.5, taxPct: 25,
  baseSalary: 60_000, housingCost: 1_200,
};

function normalizeProfile(input?: Partial<Profile> | null): Profile {
  const from = input ?? {};
  const normalizedMonth = Number.isFinite(Number(from.startMonthIdx))
    ? Math.max(0, Math.min(11, Number(from.startMonthIdx)))
    : today.startMonthIdx;
  const normalizedYear = Number.isFinite(Number(from.startYear))
    ? Number(from.startYear)
    : today.startYear;
  return {
    ...DEFAULT_PROFILE,
    ...from,
    startMonthIdx: normalizedMonth,
    startYear: normalizedYear,
  };
}

interface LibraryState {
  profile:    Profile;
  setProfile: (patch: Partial<Profile>) => void;
  debts:      Debt[];
  purchases:  Purchase[];
  raises:     Raise[];
  addDebt:        (d: Omit<Debt, 'id'>) => void;
  updateDebt:     (id: string, patch: Partial<Debt>) => void;
  removeDebt:     (id: string) => void;
  addPurchase:    (p: Omit<Purchase, 'id'>) => void;
  updatePurchase: (id: string, patch: Partial<Purchase>) => void;
  removePurchase: (id: string) => void;
  addRaise:       (r: Omit<Raise, 'id'>) => void;
  updateRaise:    (id: string, patch: Partial<Raise>) => void;
  removeRaise:    (id: string) => void;
}

export const useLibraryStore = create<LibraryState>()(
  devtools(
    persist(
      (set) => ({
        profile:    normalizeProfile(DEFAULT_PROFILE),
        setProfile: (patch) => set(s => ({ profile: normalizeProfile({ ...s.profile, ...patch }) })),

        debts:     [],
        purchases: [],
        raises:    [],

        addDebt: (d) =>
          set(s => ({ debts: [...s.debts, { ...d, id: crypto.randomUUID() }] })),
        updateDebt: (id, patch) =>
          set(s => ({ debts: s.debts.map(d => d.id === id ? { ...d, ...patch } : d) })),
        removeDebt: (id) =>
          set(s => ({ debts: s.debts.filter(d => d.id !== id) })),

        addPurchase: (p) =>
          set(s => ({ purchases: [...s.purchases, { ...p, id: crypto.randomUUID() }] })),
        updatePurchase: (id, patch) =>
          set(s => ({ purchases: s.purchases.map(p => p.id === id ? { ...p, ...patch } : p) })),
        removePurchase: (id) =>
          set(s => ({ purchases: s.purchases.filter(p => p.id !== id) })),

        addRaise: (r) =>
          set(s => ({ raises: [...s.raises, { ...r, id: crypto.randomUUID() }] })),
        updateRaise: (id, patch) =>
          set(s => ({ raises: s.raises.map(r => r.id === id ? { ...r, ...patch } : r) })),
        removeRaise: (id) =>
          set(s => ({ raises: s.raises.filter(r => r.id !== id) })),
      }),
      {
        name: 'projection-library',
        merge: (persistedState, currentState) => {
          const persisted = (persistedState as Partial<LibraryState> | undefined) ?? {};
          const current = currentState as LibraryState;
          return {
            ...current,
            ...persisted,
            profile: normalizeProfile(persisted.profile ?? current.profile),
          };
        },
      },
    ),
    { name: 'LibraryStore' },
  ),
);
