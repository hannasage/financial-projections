import { create } from 'zustand';
import type { Plan } from '../lib/types';

interface PlansState {
  plans:         Plan[];
  activePlanIds: Set<string>;
  setPlans:      (plans: Plan[]) => void;
  upsertPlan:    (plan: Plan) => void;
  removePlan:    (id: string) => void;
  toggle:        (id: string) => void;
  setAll:        () => void;
  setNone:       () => void;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans:         [],
  activePlanIds: new Set(),

  setPlans(plans) {
    set({
      plans,
      activePlanIds: new Set(plans.map(p => p.id)),
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
      activePlanIds.add(plan.id);
      return { plans, activePlanIds };
    });
  },

  removePlan(id) {
    set(state => {
      const activePlanIds = new Set(state.activePlanIds);
      activePlanIds.delete(id);
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
      return { activePlanIds };
    });
  },

  setAll() {
    set(state => ({
      activePlanIds: new Set(state.plans.map(p => p.id)),
    }));
  },

  setNone() {
    set({ activePlanIds: new Set() });
  },
}));
