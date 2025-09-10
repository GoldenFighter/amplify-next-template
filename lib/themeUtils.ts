import { useTheme as useAmplifyTheme } from '@aws-amplify/ui-react';
import { useTheme as usePicFightTheme } from './ThemeContext';

/**
 * Custom hook that provides easy access to theme tokens
 * Combines Amplify UI theme tokens with PicFight theme context
 */
export const useThemeTokens = () => {
  const { tokens } = useAmplifyTheme();
  const { currentTheme, colorMode } = usePicFightTheme();
  
  return {
    // Color tokens
    colors: {
      // Brand colors (using CSS variables from our custom theme)
      brand: {
        primary: '#d97706', // Default orange
        secondary: '#059669', // Default green
        tertiary: '#dc2626', // Default red
      },
      // Primary color scale (using CSS variables from our custom theme)
      primary: {
        10: '#fef3c7', // Lightest orange
        20: '#fde68a', // Light orange
        40: '#f59e0b', // Medium light orange
        60: '#d97706', // Main orange
        80: '#b45309', // Dark orange
        90: '#92400e', // Darker orange
        100: '#78350f', // Darkest orange
      },
      // Font colors (using CSS variables from our custom theme)
      font: {
        primary: '#1f2937', // Dark gray for main text
        secondary: '#6b7280', // Medium gray for secondary text
        tertiary: '#9ca3af', // Light gray for tertiary text
        inverse: '#ffffff', // White text for dark backgrounds
        interactive: '#d97706', // Brand color for links
      },
      // Background colors (using CSS variables from our custom theme)
      background: {
        primary: '#ffffff', // White background
        secondary: '#f9fafb', // Light gray background
        tertiary: '#f3f4f6', // Slightly darker gray
        inverse: '#111827', // Dark background
      },
      // Border colors (using CSS variables from our custom theme)
      border: {
        primary: '#e5e7eb', // Light gray borders
        secondary: '#d1d5db', // Medium gray borders
        focus: '#d97706', // Brand color for focus states
        error: '#dc2626', // Red for error states
        success: '#059669', // Green for success states
      },
      // Status colors (using CSS variables from our custom theme)
      success: {
        primary: '#059669',
        secondary: '#d1fae5',
      },
      warning: {
        primary: '#f59e0b',
        secondary: '#fef3c7',
      },
      error: {
        primary: '#dc2626',
        secondary: '#fef2f2',
      },
      info: {
        primary: '#2563eb',
        secondary: '#dbeafe',
      },
    },
    // Spacing tokens
    space: {
      xs: tokens.space?.xs?.value || '0.25rem',
      small: tokens.space?.small?.value || '0.5rem',
      medium: tokens.space?.medium?.value || '1rem',
      large: tokens.space?.large?.value || '1.5rem',
      xl: tokens.space?.xl?.value || '2rem',
      xxl: tokens.space?.xxl?.value || '3rem',
    },
    // Border radius tokens
    radii: {
      xs: tokens.radii?.xs?.value || '0.125rem',
      small: tokens.radii?.small?.value || '0.25rem',
      medium: tokens.radii?.medium?.value || '0.5rem',
      large: tokens.radii?.large?.value || '0.75rem',
      xl: tokens.radii?.xl?.value || '1rem',
    },
    // Shadow tokens (converted to CSS strings)
    shadows: {
      small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    // Font tokens
    fonts: {
      default: tokens.fonts?.default?.variable?.value || 'Inter, system-ui, sans-serif',
    },
    // Theme metadata
    themeName: currentTheme.name,
    colorMode,
  };
};

/**
 * Utility function to get a color value from theme tokens
 * @param colorPath - Path to the color token (e.g., 'brand.primary', 'font.secondary')
 * @returns The color value or a fallback
 */
export const getThemeColor = (colorPath: string): string => {
  const { colors } = useThemeTokens();
  const pathParts = colorPath.split('.');
  let current: any = colors;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return '#000000'; // Fallback color
    }
  }
  
  return typeof current === 'string' ? current : '#000000';
};

/**
 * Utility function to get a spacing value from theme tokens
 * @param spaceKey - The spacing key (e.g., 'small', 'medium', 'large')
 * @returns The spacing value or a fallback
 */
export const getThemeSpace = (spaceKey: string): string => {
  const { space } = useThemeTokens();
  return space[spaceKey as keyof typeof space] || '1rem';
};

/**
 * Utility function to get a border radius value from theme tokens
 * @param radiusKey - The radius key (e.g., 'small', 'medium', 'large')
 * @returns The radius value or a fallback
 */
export const getThemeRadius = (radiusKey: string): string => {
  const { radii } = useThemeTokens();
  return radii[radiusKey as keyof typeof radii] || '0.25rem';
};
