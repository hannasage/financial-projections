export const START_YEAR = 2026;

export const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export const YEARS = Array.from({ length: 20 }, (_, i) => START_YEAR + i);

export const COLORS = {
  bg:      '#07090C',
  surface: '#0D1117',
  faint:   '#0A0E14',
  border:  '#1B2535',
  accent:  '#C9F53A',
  dim:     '#8CB025',
  blue:    '#5B9CF6',
  orange:  '#F97316',
  red:     '#F87171',
  purple:  '#C084FC',
  text:    '#DDE3EE',
  muted:   '#8396AB',
} as const;

export const PLAN_COLORS = [
  { label: 'Chartreuse', value: '#C9F53A' },
  { label: 'Sky',        value: '#5B9CF6' },
  { label: 'Tangerine',  value: '#F97316' },
  { label: 'Lavender',   value: '#C084FC' },
  { label: 'Coral',      value: '#F87171' },
  { label: 'Mint',       value: '#34D399' },
  { label: 'Gold',       value: '#FBBF24' },
  { label: 'Rose',       value: '#FB7185' },
  { label: 'Cyan',       value: '#22D3EE' },
  { label: 'Slate',      value: '#94A3B8' },
] as const;

export const RETURN_RATES: Record<string, number> = {
  none:     0,
  hysa:     0.045,
  invested: 0.07,
};
