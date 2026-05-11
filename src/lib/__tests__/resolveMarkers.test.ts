import { describe, it, expect } from 'vitest';
import { resolveMarkers } from '../resolveItems';
import type { Marker } from '../types';

function marker(over: Partial<Marker> & Pick<Marker, 'id' | 'title'>): Marker {
  return {
    color: 'accent',
    startYear: 2026,
    startMonthIdx: 0,
    ...over,
  };
}

describe('resolveMarkers', () => {
  it('returns library markers first, then plan customs', () => {
    const lib: Marker[] = [
      marker({ id: 'lib-1', title: 'Kids in College' }),
      marker({ id: 'lib-2', title: 'Retirement' }),
    ];
    const plan = {
      markers: [marker({ id: 'plan-1', title: 'Sabbatical' })],
      excludedMarkerIds: [],
    };
    const out = resolveMarkers(plan, lib);
    expect(out).toHaveLength(3);
    expect(out.map(m => m.id)).toEqual(['lib-1', 'lib-2', 'plan-1']);
  });

  it('excludes library markers listed in excludedMarkerIds', () => {
    const lib: Marker[] = [
      marker({ id: 'lib-1', title: 'Kids in College' }),
      marker({ id: 'lib-2', title: 'Retirement' }),
    ];
    const plan = {
      markers: [],
      excludedMarkerIds: ['lib-1'],
    };
    const out = resolveMarkers(plan, lib);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('lib-2');
  });

  it('handles missing plan markers / excluded ids gracefully', () => {
    const lib: Marker[] = [marker({ id: 'lib-only', title: 'Phase' })];
    const out = resolveMarkers(undefined, lib);
    expect(out).toEqual(lib);
  });

  it('handles missing library markers gracefully', () => {
    const plan = {
      markers: [marker({ id: 'plan-1', title: 'Custom' })],
    };
    const out = resolveMarkers(plan, undefined);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('plan-1');
  });

  it('returns empty list when neither input has markers', () => {
    expect(resolveMarkers(undefined, undefined)).toEqual([]);
    expect(resolveMarkers({}, [])).toEqual([]);
  });
});
