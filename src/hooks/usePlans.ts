import { useEffect, useCallback } from 'react';
import { pb } from '../lib/pb';
import { usePlansStore } from '../stores/plansStore';
import { useAuthStore } from '../stores/authStore';
import type { Plan, Scenario } from '../lib/types';

function parsePlan(raw: Record<string, unknown>): Plan {
  return {
    id:          raw.id as string,
    user:        raw.user as string,
    title:       (raw.title as string) || 'Untitled',
    description: (raw.description as string) || '',
    color:       (raw.color as string) || '#C9F53A',
    scenario:    typeof raw.scenario === 'string'
                   ? JSON.parse(raw.scenario) as Scenario
                   : raw.scenario as Scenario,
    created:     raw.created as string,
    updated:     raw.updated as string,
  };
}

export function usePlans() {
  const userId   = useAuthStore(s => s.userId);
  const setPlans = usePlansStore(s => s.setPlans);
  const upsert   = usePlansStore(s => s.upsertPlan);
  const remove   = usePlansStore(s => s.removePlan);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    pb.collection('plans')
      .getFullList({ sort: '-created' })
      .then(records => {
        if (!cancelled) setPlans(records.map(r => parsePlan(r as unknown as Record<string, unknown>)));
      })
      .catch(console.error);

    const unsub = pb.collection('plans').subscribe('*', e => {
      if (e.action === 'delete') {
        remove(e.record.id);
      } else {
        upsert(parsePlan(e.record as unknown as Record<string, unknown>));
      }
    });

    return () => {
      cancelled = true;
      unsub.then(fn => fn()).catch(() => {});
    };
  }, [userId, setPlans, upsert, remove]);

  const createPlan = useCallback(
    async (data: { title: string; description: string; color: string; scenario: Scenario }): Promise<Plan> => {
      if (!userId) throw new Error('Not authenticated');
      const raw = await pb.collection('plans').create({
        user:        userId,
        title:       data.title,
        description: data.description,
        color:       data.color,
        scenario:    JSON.stringify(data.scenario),
      });
      const plan = parsePlan(raw as unknown as Record<string, unknown>);
      upsert(plan);
      return plan;
    },
    [userId, upsert],
  );

  const updatePlan = useCallback(
    async (id: string, data: { title?: string; description?: string; color?: string; scenario?: Scenario }): Promise<Plan> => {
      const payload: Record<string, unknown> = { ...data };
      if (data.scenario) payload.scenario = JSON.stringify(data.scenario);
      const raw  = await pb.collection('plans').update(id, payload);
      const plan = parsePlan(raw as unknown as Record<string, unknown>);
      upsert(plan);
      return plan;
    },
    [upsert],
  );

  const deletePlan = useCallback(
    async (id: string): Promise<void> => {
      await pb.collection('plans').delete(id);
      remove(id);
    },
    [remove],
  );

  return { createPlan, updatePlan, deletePlan };
}
