export interface ThemeColors {
  bg:           string;
  surface:      string;
  faint:        string;
  border:       string;
  text:         string;
  muted:        string;
  accent:       string;
  dim:          string;
  blue:         string;
  orange:       string;
  red:          string;
  purple:       string;
  textOnAccent: string;
}

export interface PlanColor { label: string; value: string; }

export interface Theme {
  id:         string;
  name:       string;
  isDark:     boolean;
  colors:     ThemeColors;
  planColors: PlanColor[];   // exactly 10, slots 0-9
}

export const THEMES: Theme[] = [
  {
    id: 'projection',
    name: 'Projection',
    isDark: true,
    colors: {
      bg: '#07090C', surface: '#0D1117', faint: '#0A0E14', border: '#1B2535',
      text: '#DDE3EE', muted: '#8396AB', accent: '#C9F53A', dim: '#8CB025',
      blue: '#5B9CF6', orange: '#F97316', red: '#F87171', purple: '#C084FC',
      textOnAccent: '#07090C',
    },
    planColors: [
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
    ],
  },
  {
    id: 'midnight-reef',
    name: 'Midnight Reef',
    isDark: true,
    colors: {
      bg: '#021721', surface: '#062535', faint: '#041d2a', border: '#0e3c52',
      text: '#e2f2fa', muted: '#7abcd4', accent: '#ffb703', dim: '#cc9800',
      blue: '#219ebc', orange: '#fb8500', red: '#ff6b6c', purple: '#a480cf',
      textOnAccent: '#021721',
    },
    planColors: [
      { label: 'Gold',      value: '#ffb703' },
      { label: 'Reef',      value: '#8ecae6' },
      { label: 'Tangerine', value: '#fb8500' },
      { label: 'Mauve',     value: '#a480cf' },
      { label: 'Coral',     value: '#ff6b6c' },
      { label: 'Seafoam',   value: '#34d399' },
      { label: 'Honey',     value: '#fcd34d' },
      { label: 'Blossom',   value: '#ffc8dd' },
      { label: 'Teal',      value: '#219ebc' },
      { label: 'Fog',       value: '#b8b8d1' },
    ],
  },
  {
    id: 'neon-arcade',
    name: 'Neon Arcade',
    isDark: true,
    colors: {
      bg: '#09091a', surface: '#12122e', faint: '#0d0d24', border: '#20205a',
      text: '#f0eeff', muted: '#8888cc', accent: '#ffbe0b', dim: '#d4a009',
      blue: '#3a86ff', orange: '#fb5607', red: '#ff006e', purple: '#8338ec',
      textOnAccent: '#09091a',
    },
    planColors: [
      { label: 'Zap',    value: '#ffbe0b' },
      { label: 'Volt',   value: '#3a86ff' },
      { label: 'Blaze',  value: '#fb5607' },
      { label: 'Pulse',  value: '#8338ec' },
      { label: 'Magma',  value: '#ff006e' },
      { label: 'Glow',   value: '#06d6a0' },
      { label: 'Flash',  value: '#ffd166' },
      { label: 'Fizz',   value: '#ff9ec8' },
      { label: 'Neon',   value: '#00e5ff' },
      { label: 'Static', value: '#a0a8cc' },
    ],
  },
  {
    id: 'deep-forest',
    name: 'Deep Forest',
    isDark: true,
    colors: {
      bg: '#0b1a0d', surface: '#102514', faint: '#0d1f10', border: '#1d3d23',
      text: '#edf5e8', muted: '#78aa58', accent: '#a7c957', dim: '#8aa844',
      blue: '#5b9cf6', orange: '#fb8500', red: '#bc4749', purple: '#c084fc',
      textOnAccent: '#0b1a0d',
    },
    planColors: [
      { label: 'Lime',   value: '#a7c957' },
      { label: 'Sky',    value: '#5b9cf6' },
      { label: 'Rust',   value: '#fb8500' },
      { label: 'Violet', value: '#c084fc' },
      { label: 'Berry',  value: '#bc4749' },
      { label: 'Fern',   value: '#6a994e' },
      { label: 'Honey',  value: '#fbbf24' },
      { label: 'Bloom',  value: '#fb7185' },
      { label: 'Spring', value: '#22d3ee' },
      { label: 'Stone',  value: '#94a3b8' },
    ],
  },
  {
    id: 'ember-tide',
    name: 'Ember Tide',
    isDark: true,
    colors: {
      bg: '#001524', surface: '#062337', faint: '#041c2e', border: '#0e3650',
      text: '#ffecd1', muted: '#8ab5c5', accent: '#ff7d00', dim: '#d46800',
      blue: '#15616d', orange: '#ff7d00', red: '#e05020', purple: '#9070c8',
      textOnAccent: '#001524',
    },
    planColors: [
      { label: 'Ember',  value: '#ff7d00' },
      { label: 'Tide',   value: '#15616d' },
      { label: 'Amber',  value: '#ffb703' },
      { label: 'Dusk',   value: '#9070c8' },
      { label: 'Char',   value: '#e05020' },
      { label: 'Sage',   value: '#6a994e' },
      { label: 'Sand',   value: '#ffecd1' },
      { label: 'Coral',  value: '#ff8fab' },
      { label: 'Wave',   value: '#49b6ff' },
      { label: 'Drift',  value: '#b8b8d1' },
    ],
  },
  {
    id: 'noir-bloom',
    name: 'Noir Bloom',
    isDark: true,
    colors: {
      bg: '#0e0620', surface: '#180d38', faint: '#130a2c', border: '#2e1060',
      text: '#f5eaff', muted: '#a080cc', accent: '#ff499e', dim: '#d43c8a',
      blue: '#779be7', orange: '#fb8500', red: '#ff2060', purple: '#a480cf',
      textOnAccent: '#0e0620',
    },
    planColors: [
      { label: 'Bloom',      value: '#ff499e' },
      { label: 'Periwinkle', value: '#779be7' },
      { label: 'Torch',      value: '#fb8500' },
      { label: 'Orchid',     value: '#a480cf' },
      { label: 'Flame',      value: '#ff2060' },
      { label: 'Jade',       value: '#34d399' },
      { label: 'Citrine',    value: '#ffc145' },
      { label: 'Petal',      value: '#d264b6' },
      { label: 'Azure',      value: '#49b6ff' },
      { label: 'Mist',       value: '#b8b8d1' },
    ],
  },
  {
    id: 'dusk-protocol',
    name: 'Dusk Protocol',
    isDark: true,
    colors: {
      bg: '#12122a', surface: '#1c1c42', faint: '#171735', border: '#2a2a58',
      text: '#fffffb', muted: '#9898c8', accent: '#ffc145', dim: '#d4a030',
      blue: '#5b9cf6', orange: '#ff9640', red: '#ff6b6c', purple: '#8878cc',
      textOnAccent: '#12122a',
    },
    planColors: [
      { label: 'Dusk Gold', value: '#ffc145' },
      { label: 'Protocol',  value: '#5b9cf6' },
      { label: 'Ember',     value: '#ff9640' },
      { label: 'Indigo',    value: '#8878cc' },
      { label: 'Signal',    value: '#ff6b6c' },
      { label: 'Matrix',    value: '#34d399' },
      { label: 'Terminal',  value: '#ffbe0b' },
      { label: 'Static',    value: '#ff85a1' },
      { label: 'Sync',      value: '#22d3ee' },
      { label: 'Slate',     value: '#b8b8d1' },
    ],
  },
  {
    id: 'pillow-fort',
    name: 'Pillow Fort',
    isDark: true,
    colors: {
      bg: '#1c0d38', surface: '#261545', faint: '#1f1040', border: '#3a1d6a',
      text: '#fffdf5', muted: '#c0a8d8', accent: '#bdb2ff', dim: '#a09ae0',
      blue: '#a0c4ff', orange: '#ffd6a5', red: '#ffadad', purple: '#ffc6ff',
      textOnAccent: '#1c0d38',
    },
    planColors: [
      { label: 'Dream',       value: '#bdb2ff' },
      { label: 'Cloud',       value: '#a0c4ff' },
      { label: 'Peach',       value: '#ffd6a5' },
      { label: 'Lilac',       value: '#ffc6ff' },
      { label: 'Blush',       value: '#ffadad' },
      { label: 'Mint',        value: '#caffbf' },
      { label: 'Butter',      value: '#fdffb6' },
      { label: 'Cotton',      value: '#ffcfe6' },
      { label: 'Ice',         value: '#9bf6ff' },
      { label: 'Marshmallow', value: '#e8e4ff' },
    ],
  },
  {
    id: 'coastal-day',
    name: 'Coastal Day',
    isDark: false,
    colors: {
      bg: '#f0f8ff', surface: '#ffffff', faint: '#e4f4fc', border: '#c0d8f0',
      text: '#023047', muted: '#2d6888', accent: '#0e7490', dim: '#0a5e73',
      blue: '#0e7490', orange: '#b35400', red: '#c01c28', purple: '#5040a0',
      textOnAccent: '#ffffff',
    },
    planColors: [
      { label: 'Navy',    value: '#023047' },
      { label: 'Ocean',   value: '#0e7490' },
      { label: 'Rust',    value: '#9a3800' },
      { label: 'Dusk',    value: '#4a2890' },
      { label: 'Crimson', value: '#b01828' },
      { label: 'Moss',    value: '#2a6040' },
      { label: 'Amber',   value: '#7a5000' },
      { label: 'Berry',   value: '#842050' },
      { label: 'Lagoon',  value: '#006880' },
      { label: 'Slate',   value: '#4a5568' },
    ],
  },
  {
    id: 'fernwood',
    name: 'Fernwood',
    isDark: false,
    colors: {
      bg: '#f3f8ec', surface: '#ffffff', faint: '#eaf5e0', border: '#c0d8a0',
      text: '#1a2e1c', muted: '#3d6040', accent: '#2d5a30', dim: '#245026',
      blue: '#1848a0', orange: '#9a4000', red: '#8a1c1c', purple: '#4a2890',
      textOnAccent: '#ffffff',
    },
    planColors: [
      { label: 'Grove',   value: '#2a5828' },
      { label: 'Indigo',  value: '#1848a0' },
      { label: 'Rust',    value: '#9a4000' },
      { label: 'Plum',    value: '#4a2890' },
      { label: 'Crimson', value: '#8a1c1c' },
      { label: 'Fern',    value: '#386641' },
      { label: 'Bronze',  value: '#6a4800' },
      { label: 'Rose',    value: '#802048' },
      { label: 'Teal',    value: '#1a5868' },
      { label: 'Slate',   value: '#4a5568' },
    ],
  },
  {
    id: 'dust-and-flame',
    name: 'Dust & Flame',
    isDark: false,
    colors: {
      bg: '#fef8f0', surface: '#ffffff', faint: '#fdf0e0', border: '#e8d0a8',
      text: '#1a0800', muted: '#6a3a10', accent: '#a04600', dim: '#844000',
      blue: '#003049', orange: '#a04600', red: '#a01818', purple: '#4a2080',
      textOnAccent: '#ffffff',
    },
    planColors: [
      { label: 'Flame',    value: '#a04600' },
      { label: 'Midnight', value: '#003049' },
      { label: 'Smoke',    value: '#9a3800' },
      { label: 'Canyon',   value: '#5a2080' },
      { label: 'Ember',    value: '#a01818' },
      { label: 'Sage',     value: '#2a6040' },
      { label: 'Desert',   value: '#785000' },
      { label: 'Dusk',     value: '#882050' },
      { label: 'Mesa',     value: '#1a5870' },
      { label: 'Slate',    value: '#4a5568' },
    ],
  },
  {
    id: 'confetti-studio',
    name: 'Confetti Studio',
    isDark: false,
    colors: {
      bg: '#fdf5fc', surface: '#ffffff', faint: '#faecfa', border: '#e8c8e8',
      text: '#280c20', muted: '#6a3060', accent: '#aa2078', dim: '#8a1860',
      blue: '#1840a0', orange: '#9a4000', red: '#a01028', purple: '#5030a0',
      textOnAccent: '#ffffff',
    },
    planColors: [
      { label: 'Punch',    value: '#aa2078' },
      { label: 'Cobalt',   value: '#1840a0' },
      { label: 'Sunset',   value: '#9a4000' },
      { label: 'Grape',    value: '#5030a0' },
      { label: 'Cherry',   value: '#a01028' },
      { label: 'Garden',   value: '#226840' },
      { label: 'Marigold', value: '#7a5000' },
      { label: 'Rouge',    value: '#902060' },
      { label: 'Sapphire', value: '#005888' },
      { label: 'Slate',    value: '#4a5568' },
    ],
  },
];

export const DEFAULT_THEME = THEMES[0]; // projection
