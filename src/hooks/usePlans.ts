import { useEffect, useCallback } from 'react';
import { LOCAL_MODE } from '../lib/mode';
import { pb } from '../lib/pb';
import { usePlansStore } from '../stores/plansStore';
import { useAuthStore } from '../stores/authStore';
import { sanitizeMarkerArray } from '../lib/sanitizeFinanceData';
import type { Marker, Plan, Scenario } from '../lib/types';

// ── Local-mode persistence ────────────────────────────────────────────────────

const LOCAL_PLANS_KEY = 'projection-plans-local';

function getLocalPlans(): Plan[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_PLANS_KEY) ?? '[]'); } catch { return []; }
}

function saveLocalPlans(plans: Plan[]) {
  localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
}

// ── PocketBase helpers ────────────────────────────────────────────────────────

function parsePlan(raw: Record<string, unknown>): Plan {
  let markersRaw: unknown = raw.markers;
  if (typeof markersRaw === 'string') {
    try { markersRaw = JSON.parse(markersRaw); } catch { markersRaw = []; }
  }
  const markers = sanitizeMarkerArray(markersRaw);
  return {
    id:          raw.id as string,
    user:        raw.user as string,
    title:       (raw.title as string) || 'Untitled',
    description: (raw.description as string) || '',
    color:       (raw.color as string) || '#C9F53A',
    scenario:    typeof raw.scenario === 'string'
                   ? JSON.parse(raw.scenario) as Scenario
                   : raw.scenario as Scenario,
    markers:     markers.length > 0 ? markers : undefined,
    created:     raw.created as string,
    updated:     raw.updated as string,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePlans() {
  const userId   = useAuthStore(s => s.userId);
  const setPlans = usePlansStore(s => s.setPlans);
  const upsert   = usePlansStore(s => s.upsertPlan);
  const remove   = usePlansStore(s => s.removePlan);

  // Local mode: load from localStorage once on mount
  useEffect(() => {
    if (!LOCAL_MODE) return;
    setPlans(getLocalPlans());
  }, [setPlans]);

  // PocketBase mode: fetch + realtime subscription
  useEffect(() => {
    if (LOCAL_MODE || !userId) return;

    let cancelled = false;

    pb.collection('plans')
      .getFullList({ sort: '-created' })
      .then(records => {
        if (!cancelled) setPlans(records.map(r => parsePlan(r as unknown as Record<string, unknown>)));
      })
      .catch(console.error);

    const unsub = pb.collection('plans').subscribe('*', e => {
      if (e.action === 'delete') remove(e.record.id);
      else upsert(parsePlan(e.record as unknown as Record<string, unknown>));
    });

    return () => {
      cancelled = true;
      unsub.then(fn => fn()).catch(() => {});
    };
  }, [userId, setPlans, upsert, remove]);

  // ── createPlan ──────────────────────────────────────────────────────────────

  const createPlan = useCallback(
    async (data: { title: string; description: string; color: string; scenario: Scenario; markers?: Marker[] }): Promise<Plan> => {
      const cleanMarkers = sanitizeMarkerArray(data.markers);
      if (LOCAL_MODE) {
        const plan: Plan = {
          id:          crypto.randomUUID(),
          user:        'local',
          title:       data.title,
          description: data.description,
          color:       data.color,
          scenario:    data.scenario,
          markers:     cleanMarkers.length > 0 ? cleanMarkers : undefined,
          created:     new Date().toISOString(),
          updated:     new Date().toISOString(),
        };
        saveLocalPlans([...getLocalPlans(), plan]);
        upsert(plan);
        return plan;
      }

      if (!userId) throw new Error('Not authenticated');
      const raw = await pb.collection('plans').create({
        user:        userId,
        title:       data.title,
        description: data.description,
        color:       data.color,
        scenario:    JSON.stringify(data.scenario),
        markers:     JSON.stringify(cleanMarkers),
      });
      const plan = parsePlan(raw as unknown as Record<string, unknown>);
      upsert(plan);
      return plan;
    },
    [userId, upsert],
  );

  // ── updatePlan ──────────────────────────────────────────────────────────────

  const updatePlan = useCallback(
    async (id: string, data: { title?: string; description?: string; color?: string; scenario?: Scenario; markers?: Marker[] }): Promise<Plan> => {
      const cleanMarkers = data.markers !== undefined ? sanitizeMarkerArray(data.markers) : undefined;
      if (LOCAL_MODE) {
        const all      = getLocalPlans();
        const existing = all.find(p => p.id === id);
        if (!existing) throw new Error('Plan not found');
        const updated: Plan = {
          ...existing,
          ...data,
          markers: cleanMarkers !== undefined
            ? (cleanMarkers.length > 0 ? cleanMarkers : undefined)
            : existing.markers,
          updated: new Date().toISOString(),
        };
        saveLocalPlans(all.map(p => p.id === id ? updated : p));
        upsert(updated);
        return updated;
      }

      const payload: Record<string, unknown> = { ...data };
      if (data.scenario) payload.scenario = JSON.stringify(data.scenario);
      if (cleanMarkers !== undefined) payload.markers = JSON.stringify(cleanMarkers);
      const raw  = await pb.collection('plans').update(id, payload);
      const plan = parsePlan(raw as unknown as Record<string, unknown>);
      upsert(plan);
      return plan;
    },
    [upsert],
  );

  // ── deletePlan ──────────────────────────────────────────────────────────────

  const deletePlan = useCallback(
    async (id: string): Promise<void> => {
      if (LOCAL_MODE) {
        saveLocalPlans(getLocalPlans().filter(p => p.id !== id));
        remove(id);
        return;
      }
      await pb.collection('plans').delete(id);
      remove(id);
    },
    [remove],
  );

  return { createPlan, updatePlan, deletePlan };
}
