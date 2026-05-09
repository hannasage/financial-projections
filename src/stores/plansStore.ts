import { create } from 'zustand';
import type { Plan } from '../lib/types';

const ORDER_KEY  = 'projection-plan-order';
const ACTIVE_KEY = 'projection-plan-active';

function savedOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]'); } catch { return []; }
}

function saveOrder(ids: string[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
}

function savedActive(): string[] | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw !== null ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveActive(ids: string[]) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(ids));
}

function applyOrder(plans: Plan[], order: string[]): Plan[] {
  if (order.length === 0) return plans;
  const map = new Map(plans.map(p => [p.id, p]));
  const sorted = order.flatMap(id => map.has(id) ? [map.get(id)!] : []);
  const unseen = plans.filter(p => !order.includes(p.id));
  return [...sorted, ...unseen];
}

interface PlansState {
  plans:         Plan[];
  activePlanIds: Set<string>;
  setPlans:      (plans: Plan[]) => void;
  upsertPlan:    (plan: Plan) => void;
  removePlan:    (id: string) => void;
  reorderPlans:  (ids: string[]) => void;
  toggle:        (id: string) => void;
  setAll:        () => void;
  setNone:       () => void;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans:         [],
  activePlanIds: new Set(),

  setPlans(plans) {
    const ordered   = applyOrder(plans, savedOrder());
    const allIds    = new Set(ordered.map(p => p.id));
    const prevActive = savedActive();
    // Restore saved selection, but only for plans that still exist.
    // Fall back to all-active if nothing was saved or nothing matches.
    const restored = prevActive !== null
      ? new Set(prevActive.filter(id => allIds.has(id)))
      : allIds;
    const activePlanIds = restored.size > 0 ? restored : allIds;
    set({ plans: ordered, activePlanIds });
  },

  reorderPlans(ids) {
    set(state => {
      const ordered = applyOrder(state.plans, ids);
      saveOrder(ids);
      return { plans: ordered };
    });
  },

  upsertPlan(plan) {
    set(state => {
      const idx = state.plans.findIndex(p => p.id === plan.id);
      const plans =
        idx >= 0
          ? state.plans.map(p => (p.id === plan.id ? plan : p))
          : [...state.plans, plan];
      const activePlanIds = new Set(state.activePlanIds);
      // Newly created plans default to active.
      if (idx < 0) activePlanIds.add(plan.id);
      saveActive([...activePlanIds]);
      return { plans, activePlanIds };
    });
  },

  removePlan(id) {
    set(state => {
      const activePlanIds = new Set(state.activePlanIds);
      activePlanIds.delete(id);
      saveActive([...activePlanIds]);
      return {
        plans: state.plans.filter(p => p.id !== id),
        activePlanIds,
      };
    });
  },

  toggle(id) {
    set(state => {
      const activePlanIds = new Set(state.activePlanIds);
      if (activePlanIds.has(id)) activePlanIds.delete(id);
      else activePlanIds.add(id);
      saveActive([...activePlanIds]);
      return { activePlanIds };
    });
  },

  setAll() {
    set(state => {
      const activePlanIds = new Set(state.plans.map(p => p.id));
      saveActive([...activePlanIds]);
      return { activePlanIds };
    });
  },

  setNone() {
    saveActive([]);
    set({ activePlanIds: new Set() });
  },
}));
