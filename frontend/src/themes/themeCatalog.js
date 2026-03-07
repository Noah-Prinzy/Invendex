export const DEFAULT_THEME_ID = 'inventra-classic';

export const APP_THEMES = Object.freeze([
  {
    id: 'inventra-classic',
    label: 'Inventra Classic',
    description: 'Navy, cyan, and crisp control surfaces.',
    swatches: ['#061224', '#1f8fda', '#aee3ff', '#edf4fd']
  },
  {
    id: 'glacier-blue',
    label: 'Glacier Blue',
    description: 'Cool blue gradients with brighter accents.',
    swatches: ['#051b2f', '#2e9de6', '#c0ebff', '#edf7ff']
  },
  {
    id: 'emerald-shift',
    label: 'Emerald Shift',
    description: 'Green-leaning palette for a calmer workspace.',
    swatches: ['#071b17', '#2f9d78', '#bfeedd', '#effaf6']
  },
  {
    id: 'graphite-noir',
    label: 'Graphite Noir',
    description: 'Slate and indigo tones with refined contrast.',
    swatches: ['#11151f', '#5871e4', '#c8d5ff', '#eaeef7']
  },
  {
    id: 'sunset-ember',
    label: 'Sunset Ember',
    description: 'Warm amber and coral tones with sunset contrast.',
    swatches: ['#2b1408', '#f27b35', '#ffd4ad', '#fff3e7']
  },
  {
    id: 'royal-violet',
    label: 'Royal Violet',
    description: 'Deep violet gradients and luxe lilac accents.',
    swatches: ['#1a1129', '#7b5be6', '#d9ccff', '#f4f0ff']
  },
  {
    id: 'sand-dune',
    label: 'Sand Dune',
    description: 'Earthy neutrals with bronze highlights.',
    swatches: ['#241d17', '#b07a3f', '#ead3b8', '#f8f2e9']
  },
  {
    id: 'neon-grid',
    label: 'Neon Grid',
    description: 'High-energy cyan and magenta on dark surfaces.',
    swatches: ['#080b17', '#1ee7ff', '#ff55cf', '#edf4ff']
  }
]);

export const getThemeById = (themeId) =>
  APP_THEMES.find((theme) => theme.id === String(themeId || '').trim()) || null;

export const isKnownThemeId = (themeId) => Boolean(getThemeById(themeId));
