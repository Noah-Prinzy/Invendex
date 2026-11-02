const LEGACY_THEME_ID_ALIASES = Object.freeze({});

const normalizeThemeId = (themeId) =>
  LEGACY_THEME_ID_ALIASES[String(themeId || '').trim()] ||
  String(themeId || '').trim();

export const DEFAULT_THEME_ID = 'invendex-classic';

export const APP_THEMES = Object.freeze([
  {
    id: 'invendex-classic',
    label: 'Invendex Classic',
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
  },
  {
    id: 'crimson-forge',
    label: 'Crimson Forge',
    description: 'Deep charcoal grounded by molten red accents.',
    swatches: ['#1a0e0e', '#d63e3e', '#ffb3ab', '#fdeceb']
  },
  {
    id: 'midnight-teal',
    label: 'Midnight Teal',
    description: 'Ink-dark teal with glassy aqua highlights.',
    swatches: ['#04191c', '#1fb7ac', '#a8ecdf', '#e9fbf6']
  },
  {
    id: 'rose-quartz',
    label: 'Rose Quartz',
    description: 'Soft blush pinks over a warm charcoal base.',
    swatches: ['#231016', '#e8688f', '#ffcede', '#fff2f6']
  },
  {
    id: 'lime-current',
    label: 'Lime Current',
    description: 'Punchy chartreuse accents on deep forest green.',
    swatches: ['#0e1a0a', '#8fd94a', '#dcf7b0', '#f6fce9']
  },
  {
    id: 'copper-dusk',
    label: 'Copper Dusk',
    description: 'Burnished copper and plum for a moody, elegant feel.',
    swatches: ['#20121a', '#c96b3e', '#f2c9a8', '#faf0e6']
  },
  {
    id: 'arctic-mono',
    label: 'Arctic Mono',
    description: 'Near-monochrome grayscale with icy blue restraint.',
    swatches: ['#14161a', '#7d8a99', '#d7dee6', '#f6f8fa']
  },
  {
    id: 'solar-flare',
    label: 'Solar Flare',
    description: 'Bold yellow-orange energy over deep espresso brown.',
    swatches: ['#1f1408', '#ffb020', '#ffe1a3', '#fff8ea']
  },
  {
    id: 'orchid-nebula',
    label: 'Orchid Nebula',
    description: 'Cosmic magenta-purple blend with starlit lavender.',
    swatches: ['#160b22', '#b24fd6', '#e8c3fa', '#f8effd']
  }
]);

export const getThemeById = (themeId) =>
  APP_THEMES.find((theme) => theme.id === normalizeThemeId(themeId)) || null;

export const isKnownThemeId = (themeId) => Boolean(getThemeById(themeId));
