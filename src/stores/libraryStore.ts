import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Debt, Purchase, Raise, Scenario, Investment, RecurringCharge, Marker } from '../lib/types';
import { getTodayStartDate } from '../lib/constants';

export type Profile = Pick<Scenario,
  'startMonthIdx' | 'startYear' | 'envelope' | 'startSavings' | 'startAge' | 'horizonYears' |
  'returnMode' | 'hysaRate' | 'taxPct' | 'baseSalary' | 'housingCost' | 'monthlyAllowance' |
  'inflationPctAnnual' | 'retirementAge' | 'retirementEnvelope'
>;

const today = getTodayStartDate();
const DEFAULT_PROFILE: Profile = {
  startMonthIdx: today.startMonthIdx,
  startYear: today.startYear,
  envelope: 1_000, startSavings: 0, startAge: 30, horizonYears: 10,
  returnMode: 'hysa', hysaRate: 4.5, taxPct: 25,
  baseSalary: 60_000, housingCost: 1_200, monthlyAllowance: 0,
  inflationPctAnnual: 0,
  retirementAge: undefined,
  retirementEnvelope: undefined,
};

export function normalizeProfile(input?: Partial<Profile> | null): Profile {
  const from = input ?? {};
  const normalizedMonth = Number.isFinite(Number(from.startMonthIdx))
    ? Math.max(0, Math.min(11, Number(from.startMonthIdx)))
    : today.startMonthIdx;
  const normalizedYear = Number.isFinite(Number(from.startYear))
    ? Number(from.startYear)
    : today.startYear;
  const infRaw = Number(from.inflationPctAnnual);
  const inflationPctAnnual = Number.isFinite(infRaw)
    ? Math.min(50, Math.max(0, infRaw))
    : DEFAULT_PROFILE.inflationPctAnnual ?? 0;
  const retirementAgeRaw = Number(from.retirementAge);
  const retirementAge = Number.isFinite(retirementAgeRaw)
    ? Math.min(120, Math.max(0, retirementAgeRaw))
    : undefined;
  const retirementEnvelopeRaw = Number(from.retirementEnvelope);
  const retirementEnvelope = Number.isFinite(retirementEnvelopeRaw)
    ? Math.max(0, retirementEnvelopeRaw)
    : undefined;
  return {
    ...DEFAULT_PROFILE,
    ...from,
    startMonthIdx: normalizedMonth,
    startYear: normalizedYear,
    inflationPctAnnual,
    retirementAge,
    retirementEnvelope,
  };
}

interface LibraryState {
  profile:    Profile;
  setProfile: (patch: Partial<Profile>) => void;
  debts:      Debt[];
  purchases:  Purchase[];
  raises:     Raise[];
  investments:     Investment[];
  recurringCharges: RecurringCharge[];
  /** Phase markers shared across plans (each plan can exclude or fork specific ones). */
  markers:    Marker[];
  addDebt:        (d: Omit<Debt, 'id'>) => string;
  updateDebt:     (id: string, patch: Partial<Debt>) => void;
  removeDebt:     (id: string) => void;
  addPurchase:    (p: Omit<Purchase, 'id'>) => string;
  updatePurchase: (id: string, patch: Partial<Purchase>) => void;
  removePurchase: (id: string) => void;
  addRaise:       (r: Omit<Raise, 'id'>) => string;
  updateRaise:    (id: string, patch: Partial<Raise>) => void;
  removeRaise:    (id: string) => void;
  addInvestment:       (i: Omit<Investment, 'id'>) => string;
  updateInvestment:    (id: string, patch: Partial<Investment>) => void;
  removeInvestment:    (id: string) => void;
  addRecurringCharge:  (c: Omit<RecurringCharge, 'id'>) => string;
  updateRecurringCharge: (id: string, patch: Partial<RecurringCharge>) => void;
  removeRecurringCharge: (id: string) => void;
  addMarker:       (m: Omit<Marker, 'id'>) => string;
  updateMarker:    (id: string, patch: Partial<Marker>) => void;
  removeMarker:    (id: string) => void;
  setMarkers:      (markers: Marker[]) => void;
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
        investments:     [],
        recurringCharges: [],
        markers:   [],

        addDebt: (d) => {
          const id = crypto.randomUUID();
          set(s => ({ debts: [...s.debts, { ...d, id }] }));
          return id;
        },
        updateDebt: (id, patch) =>
          set(s => ({ debts: s.debts.map(d => d.id === id ? { ...d, ...patch } : d) })),
        removeDebt: (id) =>
          set(s => ({ debts: s.debts.filter(d => d.id !== id) })),

        addPurchase: (p) => {
          const id = crypto.randomUUID();
          set(s => ({ purchases: [...s.purchases, { ...p, id }] }));
          return id;
        },
        updatePurchase: (id, patch) =>
          set(s => ({ purchases: s.purchases.map(p => p.id === id ? { ...p, ...patch } : p) })),
        removePurchase: (id) =>
          set(s => ({ purchases: s.purchases.filter(p => p.id !== id) })),

        addRaise: (r) => {
          const id = crypto.randomUUID();
          set(s => ({ raises: [...s.raises, { ...r, id }] }));
          return id;
        },
        updateRaise: (id, patch) =>
          set(s => ({ raises: s.raises.map(r => r.id === id ? { ...r, ...patch } : r) })),
        removeRaise: (id) =>
          set(s => ({ raises: s.raises.filter(r => r.id !== id) })),

        addInvestment: (i) => {
          const id = crypto.randomUUID();
          set(s => ({ investments: [...s.investments, { ...i, id }] }));
          return id;
        },
        updateInvestment: (id, patch) =>
          set(s => ({ investments: s.investments.map(x => x.id === id ? { ...x, ...patch } : x) })),
        removeInvestment: (id) =>
          set(s => ({ investments: s.investments.filter(x => x.id !== id) })),

        addRecurringCharge: (c) => {
          const id = crypto.randomUUID();
          set(s => ({ recurringCharges: [...s.recurringCharges, { ...c, id }] }));
          return id;
        },
        updateRecurringCharge: (id, patch) =>
          set(s => ({ recurringCharges: s.recurringCharges.map(x => x.id === id ? { ...x, ...patch } : x) })),
        removeRecurringCharge: (id) =>
          set(s => ({ recurringCharges: s.recurringCharges.filter(x => x.id !== id) })),

        addMarker: (m) => {
          const id = crypto.randomUUID();
          set(s => ({ markers: [...s.markers, { ...m, id }] }));
          return id;
        },
        updateMarker: (id, patch) =>
          set(s => ({ markers: s.markers.map(m => m.id === id ? { ...m, ...patch } : m) })),
        removeMarker: (id) =>
          set(s => ({ markers: s.markers.filter(m => m.id !== id) })),
        setMarkers: (markers) => set({ markers }),
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
            investments: persisted.investments ?? current.investments,
            recurringCharges: persisted.recurringCharges ?? current.recurringCharges,
            markers: persisted.markers ?? current.markers,
          };
        },
      },
    ),
    { name: 'LibraryStore' },
  ),
);
