import { Theme, createTheme } from '@aws-amplify/ui-react';

// Base theme with comprehensive token coverage
export const baseTheme: Theme = {
  name: 'picfight-base',
  tokens: {
    colors: {
      // Brand colors
      brand: {
        primary: { value: '#d97706' }, // Orange brand color
        secondary: { value: '#059669' }, // Green for success
        tertiary: { value: '#dc2626' }, // Red for errors
      },
      // Primary color scale (following Amplify UI conventions)
      primary: {
        10: { value: '#fef3c7' }, // Lightest orange
        20: { value: '#fde68a' }, // Light orange
        40: { value: '#f59e0b' }, // Medium light orange
        60: { value: '#d97706' }, // Main orange
        80: { value: '#b45309' }, // Dark orange
        90: { value: '#92400e' }, // Darker orange
        100: { value: '#78350f' }, // Darkest orange
      },
      // Font colors with proper hierarchy
      font: {
        primary: { value: '{colors.neutral.100.value}' }, // Dark gray for main text
        secondary: { value: '{colors.neutral.80.value}' }, // Medium gray for secondary text
        tertiary: { value: '{colors.neutral.60.value}' }, // Light gray for tertiary text
        inverse: { value: '{colors.white.value}' }, // White text for dark backgrounds
        interactive: { value: '{colors.brand.primary.value}' }, // Brand color for links
      },
      // Background colors
      background: {
        primary: { value: '{colors.white.value}' }, // White background
        secondary: { value: '{colors.neutral.10.value}' }, // Light gray background
        tertiary: { value: '{colors.neutral.20.value}' }, // Slightly darker gray
        inverse: { value: '{colors.neutral.100.value}' }, // Dark background
      },
      // Border colors
      border: {
        primary: { value: '{colors.neutral.20.value}' }, // Light gray borders
        secondary: { value: '{colors.neutral.40.value}' }, // Medium gray borders
        focus: { value: '{colors.brand.primary.value}' }, // Brand color for focus states
        error: { value: '{colors.red.60.value}' }, // Red for error states
        success: { value: '{colors.green.60.value}' }, // Green for success states
      },
      // Status colors
      success: {
        primary: { value: '{colors.green.60.value}' },
        secondary: { value: '{colors.green.20.value}' },
      },
      warning: {
        primary: { value: '{colors.orange.60.value}' },
        secondary: { value: '{colors.orange.20.value}' },
      },
      error: {
        primary: { value: '{colors.red.60.value}' },
        secondary: { value: '{colors.red.20.value}' },
      },
      info: {
        primary: { value: '{colors.blue.60.value}' },
        secondary: { value: '{colors.blue.20.value}' },
      },
    },
    fonts: {
      default: {
        variable: { value: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
        static: { value: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
      },
    },
    space: {
      xs: { value: '0.25rem' },
      small: { value: '0.5rem' },
      medium: { value: '1rem' },
      large: { value: '1.5rem' },
      xl: { value: '2rem' },
      xxl: { value: '3rem' },
    },
    radii: {
      xs: { value: '0.125rem' },
      small: { value: '0.25rem' },
      medium: { value: '0.5rem' },
      large: { value: '0.75rem' },
      xl: { value: '1rem' },
    },
    shadows: {
      small: { value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
      medium: { value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
      large: { value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
    },
  },
  overrides: [
    {
      colorMode: 'dark',
      tokens: {
        colors: {
          background: {
            primary: { value: '{colors.neutral.100.value}' }, // Dark background
            secondary: { value: '{colors.neutral.90.value}' }, // Darker secondary
            tertiary: { value: '{colors.neutral.80.value}' }, // Dark tertiary
            inverse: { value: '{colors.white.value}' }, // White for inverse
          },
          font: {
            primary: { value: '{colors.white.value}' }, // Light text
            secondary: { value: '{colors.neutral.20.value}' }, // Medium light text
            tertiary: { value: '{colors.neutral.40.value}' }, // Medium text
            inverse: { value: '{colors.neutral.100.value}' }, // Dark text for light backgrounds
          },
          border: {
            primary: { value: '{colors.neutral.80.value}' }, // Dark borders
            secondary: { value: '{colors.neutral.60.value}' }, // Medium dark borders
          },
        },
      },
    },
  ],
};

// Create the default theme using createTheme for proper merging
export const defaultSiteTheme = createTheme({
  name: 'picfight-default',
  tokens: {
    colors: {
      // Brand colors
      brand: {
        primary: { value: '#d97706' }, // Orange brand color
        secondary: { value: '#059669' }, // Green for success
        tertiary: { value: '#dc2626' }, // Red for errors
      },
      // Primary color scale (following Amplify UI conventions)
      primary: {
        10: { value: '#fef3c7' }, // Lightest orange
        20: { value: '#fde68a' }, // Light orange
        40: { value: '#f59e0b' }, // Medium light orange
        60: { value: '#d97706' }, // Main orange
        80: { value: '#b45309' }, // Dark orange
        90: { value: '#92400e' }, // Darker orange
        100: { value: '#78350f' }, // Darkest orange
      },
      // Font colors with proper hierarchy
      font: {
        primary: { value: '{colors.neutral.100.value}' }, // Dark gray for main text
        secondary: { value: '{colors.neutral.80.value}' }, // Medium gray for secondary text
        tertiary: { value: '{colors.neutral.60.value}' }, // Light gray for tertiary text
        inverse: { value: '{colors.white.value}' }, // White text for dark backgrounds
        interactive: { value: '{colors.brand.primary.value}' }, // Brand color for links
      },
      // Background colors
      background: {
        primary: { value: '{colors.white.value}' }, // White background
        secondary: { value: '{colors.neutral.10.value}' }, // Light gray background
        tertiary: { value: '{colors.neutral.20.value}' }, // Slightly darker gray
        inverse: { value: '{colors.neutral.100.value}' }, // Dark background
      },
      // Border colors
      border: {
        primary: { value: '{colors.neutral.20.value}' }, // Light gray borders
        secondary: { value: '{colors.neutral.40.value}' }, // Medium gray borders
        focus: { value: '{colors.brand.primary.value}' }, // Brand color for focus states
        error: { value: '{colors.red.60.value}' }, // Red for error states
        success: { value: '{colors.green.60.value}' }, // Green for success states
      },
      // Status colors
      success: {
        primary: { value: '{colors.green.60.value}' },
        secondary: { value: '{colors.green.20.value}' },
      },
      warning: {
        primary: { value: '{colors.orange.60.value}' },
        secondary: { value: '{colors.orange.20.value}' },
      },
      error: {
        primary: { value: '{colors.red.60.value}' },
        secondary: { value: '{colors.red.20.value}' },
      },
      info: {
        primary: { value: '{colors.blue.60.value}' },
        secondary: { value: '{colors.blue.20.value}' },
      },
    },
    fonts: {
      default: {
        variable: { value: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
        static: { value: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
      },
    },
    space: {
      xs: { value: '0.25rem' },
      small: { value: '0.5rem' },
      medium: { value: '1rem' },
      large: { value: '1.5rem' },
      xl: { value: '2rem' },
      xxl: { value: '3rem' },
    },
    radii: {
      xs: { value: '0.125rem' },
      small: { value: '0.25rem' },
      medium: { value: '0.5rem' },
      large: { value: '0.75rem' },
      xl: { value: '1rem' },
    },
    shadows: {
      small: { value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
      medium: { value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
      large: { value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
    },
  },
  overrides: [
    {
      colorMode: 'dark',
      tokens: {
        colors: {
          background: {
            primary: { value: '{colors.neutral.100.value}' }, // Dark background
            secondary: { value: '{colors.neutral.90.value}' }, // Darker secondary
            tertiary: { value: '{colors.neutral.80.value}' }, // Dark tertiary
            inverse: { value: '{colors.white.value}' }, // White for inverse
          },
          font: {
            primary: { value: '{colors.white.value}' }, // Light text
            secondary: { value: '{colors.neutral.20.value}' }, // Medium light text
            tertiary: { value: '{colors.neutral.40.value}' }, // Medium text
            inverse: { value: '{colors.neutral.100.value}' }, // Dark text for light backgrounds
          },
          border: {
            primary: { value: '{colors.neutral.80.value}' }, // Dark borders
            secondary: { value: '{colors.neutral.60.value}' }, // Medium dark borders
          },
        },
      },
    },
  ],
});

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
  'ocean': createTheme({
    name: 'ocean-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#0891b2' }, // Ocean blue
          secondary: { value: '#0e7490' },
          tertiary: { value: '#155e75' },
        },
        primary: {
          10: { value: '#cffafe' }, // Lightest ocean blue
          20: { value: '#a5f3fc' }, // Light ocean blue
          40: { value: '#67e8f9' }, // Medium light ocean blue
          60: { value: '#0891b2' }, // Main ocean blue
          80: { value: '#0e7490' }, // Dark ocean blue
          90: { value: '#155e75' }, // Darker ocean blue
          100: { value: '#164e63' }, // Darkest ocean blue
        },
        font: {
          interactive: { value: '#0891b2' }, // Ocean blue for links
        },
        border: {
          focus: { value: '#0891b2' }, // Ocean blue for focus states
        },
      },
    },
  }),
  'sunset': createTheme({
    name: 'sunset-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#f59e0b' }, // Sunset orange
          secondary: { value: '#d97706' },
          tertiary: { value: '#b45309' },
        },
        primary: {
          10: { value: '#fef3c7' }, // Lightest sunset
          20: { value: '#fde68a' }, // Light sunset
          40: { value: '#fbbf24' }, // Medium light sunset
          60: { value: '#f59e0b' }, // Main sunset
          80: { value: '#d97706' }, // Dark sunset
          90: { value: '#b45309' }, // Darker sunset
          100: { value: '#92400e' }, // Darkest sunset
        },
        font: {
          interactive: { value: '#f59e0b' }, // Sunset orange for links
        },
        border: {
          focus: { value: '#f59e0b' }, // Sunset orange for focus states
        },
      },
    },
  }),
  'forest': createTheme({
    name: 'forest-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#059669' }, // Forest green
          secondary: { value: '#047857' },
          tertiary: { value: '#065f46' },
        },
        primary: {
          10: { value: '#d1fae5' }, // Lightest forest
          20: { value: '#a7f3d0' }, // Light forest
          40: { value: '#6ee7b7' }, // Medium light forest
          60: { value: '#059669' }, // Main forest
          80: { value: '#047857' }, // Dark forest
          90: { value: '#065f46' }, // Darker forest
          100: { value: '#064e3b' }, // Darkest forest
        },
        font: {
          interactive: { value: '#059669' }, // Forest green for links
        },
        border: {
          focus: { value: '#059669' }, // Forest green for focus states
        },
      },
    },
  }),
  'midnight': createTheme({
    name: 'midnight-theme',
    tokens: {
      colors: {
        brand: {
          primary: { value: '#1e40af' }, // Midnight blue
          secondary: { value: '#1e3a8a' },
          tertiary: { value: '#1e293b' },
        },
        primary: {
          10: { value: '#dbeafe' }, // Lightest midnight
          20: { value: '#bfdbfe' }, // Light midnight
          40: { value: '#93c5fd' }, // Medium light midnight
          60: { value: '#1e40af' }, // Main midnight
          80: { value: '#1e3a8a' }, // Dark midnight
          90: { value: '#1e293b' }, // Darker midnight
          100: { value: '#0f172a' }, // Darkest midnight
        },
        font: {
          interactive: { value: '#1e40af' }, // Midnight blue for links
        },
        border: {
          focus: { value: '#1e40af' }, // Midnight blue for focus states
        },
      },
    },
  }),
};

export type ThemePresetKey = keyof typeof themePresets;
export type ContestThemeKey = keyof typeof contestThemes;
