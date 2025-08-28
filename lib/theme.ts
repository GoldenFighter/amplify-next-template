import { Theme } from '@aws-amplify/ui-react';

// Default theme for the site
export const defaultSiteTheme: Theme = {
  name: 'picfight-default',
  tokens: {
    colors: {
      brand: {
        primary: { value: '#d97706' }, // Orange brand color
        secondary: { value: '#059669' }, // Green for success
        tertiary: { value: '#dc2626' }, // Red for errors
      },
      // Use Amplify UI's standard color tokens for immediate visual impact
      primary: {
        10: { value: '#d97706' }, // Light orange
        20: { value: '#ea580c' }, // Medium orange
        40: { value: '#c2410c' }, // Dark orange
        60: { value: '#9a3412' }, // Darker orange
        80: { value: '#7c2d12' }, // Darkest orange
        90: { value: '#451a03' }, // Very dark orange
        100: { value: '#d97706' }, // Main orange
      },
      font: {
        primary: { value: '#1f2937' }, // Dark gray for main text
        secondary: { value: '#6b7280' }, // Medium gray for secondary text
        tertiary: { value: '#9ca3af' }, // Light gray for tertiary text
      },
      background: {
        primary: { value: '#ffffff' }, // White background
        secondary: { value: '#f9fafb' }, // Light gray background
        tertiary: { value: '#f3f4f6' }, // Slightly darker gray
      },
      border: {
        primary: { value: '#e5e7eb' }, // Light gray borders
        secondary: { value: '#d1d5db' }, // Medium gray borders
      },
    },
    fonts: {
      default: {
        variable: { value: 'Inter, system-ui, sans-serif' },
        static: { value: 'Inter, system-ui, sans-serif' },
      },
    },
    space: {
      small: { value: '0.5rem' },
      medium: { value: '1rem' },
      large: { value: '1.5rem' },
      xl: { value: '2rem' },
    },
    radii: {
      small: { value: '0.25rem' },
      medium: { value: '0.5rem' },
      large: { value: '0.75rem' },
    },
  },
  overrides: [
    {
      colorMode: 'dark',
      tokens: {
        colors: {
          background: {
            primary: { value: '#111827' }, // Dark background
            secondary: { value: '#1f2937' }, // Darker secondary
            tertiary: { value: '#374151' }, // Dark tertiary
          },
          font: {
            primary: { value: '#f9fafb' }, // Light text
            secondary: { value: '#d1d5db' }, // Medium light text
            tertiary: { value: '#9ca3af' }, // Medium text
          },
          border: {
            primary: { value: '#374151' }, // Dark borders
            secondary: { value: '#4b5563' }, // Medium dark borders
          },
        },
      },
    },
  ],
};

// Contest-specific theme variations
export const contestThemes = {
  'boys-names': {
    name: 'boys-names-contest',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#2563eb' }, // Blue for boys
          secondary: { value: '#059669' },
          tertiary: { value: '#dc2626' },
        },
      },
    },
  },
  'girls-names': {
    name: 'girls-names-contest',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#ec4899' }, // Pink for girls
          secondary: { value: '#059669' },
          tertiary: { value: '#dc2626' },
        },
      },
    },
  },
  'creative-writing': {
    name: 'creative-writing-contest',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#7c3aed' }, // Purple for creativity
          secondary: { value: '#059669' },
          tertiary: { value: '#dc2626' },
        },
      },
    },
  },
};

// Theme presets for quick selection
export const themePresets = {
  'default': defaultSiteTheme,
  'ocean': {
    name: 'ocean-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#0891b2' }, // Ocean blue
          secondary: { value: '#0e7490' },
          tertiary: { value: '#155e75' },
        },
        // Amplify UI primary colors for immediate visual impact
        primary: {
          10: { value: '#0891b2' }, // Light ocean blue
          20: { value: '#0e7490' }, // Medium ocean blue
          40: { value: '#155e75' }, // Dark ocean blue
          60: { value: '#164e63' }, // Darker ocean blue
          80: { value: '#0f172a' }, // Darkest ocean blue
          90: { value: '#0c4a6e' }, // Very dark ocean blue
          100: { value: '#0891b2' }, // Main ocean blue
        },
      },
    },
  },
  'sunset': {
    name: 'sunset-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#f59e0b' }, // Sunset orange
          secondary: { value: '#d97706' },
          tertiary: { value: '#b45309' },
        },
        // Amplify UI primary colors for immediate visual impact
        primary: {
          10: { value: '#fef3c7' }, // Light sunset
          20: { value: '#fde68a' }, // Medium light sunset
          40: { value: '#f59e0b' }, // Main sunset
          60: { value: '#d97706' }, // Dark sunset
          80: { value: '#92400e' }, // Darker sunset
          90: { value: '#78350f' }, // Darkest sunset
          100: { value: '#f59e0b' }, // Main sunset
        },
      },
    },
  },
  'forest': {
    name: 'forest-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#059669' }, // Forest green
          secondary: { value: '#047857' },
          tertiary: { value: '#065f46' },
        },
        // Amplify UI primary colors for immediate visual impact
        primary: {
          10: { value: '#d1fae5' }, // Light forest
          20: { value: '#a7f3d0' }, // Medium light forest
          40: { value: '#059669' }, // Main forest
          60: { value: '#047857' }, // Dark forest
          80: { value: '#065f46' }, // Darker forest
          90: { value: '#064e3b' }, // Darkest forest
          100: { value: '#059669' }, // Main forest
        },
      },
    },
  },
  'midnight': {
    name: 'midnight-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#1e40af' }, // Midnight blue
          secondary: { value: '#1e3a8a' },
          tertiary: { value: '#1e293b' },
        },
        // Amplify UI primary colors for immediate visual impact
        primary: {
          10: { value: '#dbeafe' }, // Light midnight
          20: { value: '#bfdbfe' }, // Medium light midnight
          40: { value: '#1e40af' }, // Main midnight
          60: { value: '#1e3a8a' }, // Dark midnight
          80: { value: '#1e293b' }, // Darker midnight
          90: { value: '#0f172a' }, // Darkest midnight
          100: { value: '#1e40af' }, // Main midnight
        },
      },
    },
  },
};

export type ThemePresetKey = keyof typeof themePresets;
export type ContestThemeKey = keyof typeof contestThemes;
