import type { Plan, Debt, Purchase, Raise, Investment, RecurringCharge } from './types';
import { LOCAL_MODE } from './mode';
import { useLibraryStore, normalizeProfile, type Profile } from '../stores/libraryStore';
import { usePlansStore } from '../stores/plansStore';

export const BACKUP_FORMAT = 'projection-backup' as const;
export const BACKUP_VERSION = 1;

const LOCAL_PLANS_KEY = 'projection-plans-local';

export interface ProjectionBackupV1 {
  format:     typeof BACKUP_FORMAT;
  version:    number;
  exportedAt: string;
  library: {
    profile:          Profile;
    debts:            Debt[];
    purchases:        Purchase[];
    raises:           Raise[];
    investments:      Investment[];
    recurringCharges: RecurringCharge[];
  };
  plans:      Plan[];
  planOrder:  string[];
  planActive: string[];
  /** Where the backup was created (informational). */
  exportedFrom: 'local' | 'pocketbase';
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function coercePlans(x: unknown): Plan[] {
  if (!Array.isArray(x)) return [];
  return x.filter((p): p is Plan =>
    isRecord(p)
    && typeof p.id === 'string'
    && typeof p.title === 'string'
    && isRecord(p.scenario),
  );
}

function coerceStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((i): i is string => typeof i === 'string');
}

export function buildBackupPayload(): ProjectionBackupV1 {
  const lib   = useLibraryStore.getState();
  const plans = usePlansStore.getState().plans;
  let planOrder: string[] = [];
  let planActive: string[] = [];
  try {
    planOrder = JSON.parse(localStorage.getItem('projection-plan-order') ?? '[]');
  } catch { planOrder = []; }
  if (!Array.isArray(planOrder)) planOrder = [];
  try {
    const raw = localStorage.getItem('projection-plan-active');
    planActive = raw != null ? JSON.parse(raw) : [...usePlansStore.getState().activePlanIds];
  } catch {
    planActive = [...usePlansStore.getState().activePlanIds];
  }
  if (!Array.isArray(planActive)) planActive = [...usePlansStore.getState().activePlanIds];

  return {
    format:     BACKUP_FORMAT,
    version:    BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    library: {
      profile:          lib.profile,
      debts:            lib.debts,
      purchases:        lib.purchases,
      raises:           lib.raises,
      investments:      lib.investments,
      recurringCharges: lib.recurringCharges,
    },
    plans,
    planOrder:  planOrder.filter((id): id is string => typeof id === 'string'),
    planActive: planActive.filter((id): id is string => typeof id === 'string'),
    exportedFrom: LOCAL_MODE ? 'local' : 'pocketbase',
  };
}

export function parseBackupJson(text: string): ProjectionBackupV1 | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  if (data.format !== BACKUP_FORMAT) return null;
  if (data.version !== BACKUP_VERSION) return null;
  if (!isRecord(data.library)) return null;

  const lib = data.library;
  const profile = lib.profile;

  return {
    format:     BACKUP_FORMAT,
    version:    BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    library: {
      profile:          normalizeProfile(isRecord(profile) ? (profile as Partial<Profile>) : null),
      debts:            Array.isArray(lib.debts) ? (lib.debts as Debt[]) : [],
      purchases:        Array.isArray(lib.purchases) ? (lib.purchases as Purchase[]) : [],
      raises:           Array.isArray(lib.raises) ? (lib.raises as Raise[]) : [],
      investments:      Array.isArray(lib.investments) ? (lib.investments as Investment[]) : [],
      recurringCharges: Array.isArray(lib.recurringCharges) ? (lib.recurringCharges as RecurringCharge[]) : [],
    },
    plans:      coercePlans(data.plans),
    planOrder:  coerceStringArray(data.planOrder),
    planActive: coerceStringArray(data.planActive),
    exportedFrom: data.exportedFrom === 'pocketbase' ? 'pocketbase' : 'local',
  };
}

export type ApplyBackupResult =
  | { ok: true; plansRestored: boolean; detail: string }
  | { ok: false; error: string };

/** Apply a validated backup: always restores I/O library; restores scenarios only in local storage mode. */
export function applyBackup(payload: ProjectionBackupV1): ApplyBackupResult {
  try {
    const { library: L } = payload;
    useLibraryStore.setState({
      profile:          normalizeProfile(L.profile),
      debts:            L.debts ?? [],
      purchases:        L.purchases ?? [],
      raises:           L.raises ?? [],
      investments:      L.investments ?? [],
      recurringCharges: L.recurringCharges ?? [],
    });

    if (!LOCAL_MODE) {
      return {
        ok: true,
        plansRestored: false,
        detail: 'I/O library restored. Scenario plans are still loaded from your account — use this app in local-only mode to move plans between machines with a backup file.',
      };
    }

    const plans = payload.plans ?? [];
    localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
    usePlansStore.getState().importSnapshot(plans, payload.planOrder ?? [], payload.planActive ?? []);

    return {
      ok: true,
      plansRestored: true,
      detail: `Restored I/O library and ${plans.length} scenario(s).`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Import failed.' };
  }
}

export function downloadBackupJson(): void {
  const payload = buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const day  = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `projection-backup-${day}.json`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Human-readable CSV (profile + line items). For spreadsheets only — use the JSON file to import elsewhere. */
export function buildSummaryCsv(): string {
  const p = buildBackupPayload();
  const rows: string[][] = [['section', 'key', 'value']];
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const push = (section: string, key: string, value: string | number) => {
    rows.push([section, key, String(value)]);
  };

  Object.entries(p.library.profile).forEach(([k, v]) => push('profile', k, v as string | number));
  p.library.debts.forEach(d => push('debt', d.label || d.id, d.payment));
  p.library.recurringCharges.forEach(c => push('recurring', c.label || c.id, c.amount));
  p.library.purchases.forEach(x => push('purchase', x.label || x.id, x.payment));
  p.library.investments.forEach(i => push('investment', i.label || i.id, i.monthlyContribution));
  p.library.raises.forEach(r => push('raise', `${r.year}-${r.monthIdx}`, r.salary));
  p.plans.forEach(pl => push('plan', pl.title || pl.id, pl.id));

  return rows.map(cols => cols.map(c => esc(c)).join(',')).join('\n');
}

export function downloadSummaryCsv(): void {
  const csv = buildSummaryCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const day  = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `projection-summary-${day}.csv`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
