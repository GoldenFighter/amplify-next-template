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
      // Brand colors
      brand: {
        primary: tokens.colors.brand?.primary?.value || '#d97706',
        secondary: tokens.colors.brand?.secondary?.value || '#059669',
        tertiary: tokens.colors.brand?.tertiary?.value || '#dc2626',
      },
      // Primary color scale
      primary: {
        10: tokens.colors.primary?.[10]?.value || '#fef3c7',
        20: tokens.colors.primary?.[20]?.value || '#fde68a',
        40: tokens.colors.primary?.[40]?.value || '#f59e0b',
        60: tokens.colors.primary?.[60]?.value || '#d97706',
        80: tokens.colors.primary?.[80]?.value || '#b45309',
        90: tokens.colors.primary?.[90]?.value || '#92400e',
        100: tokens.colors.primary?.[100]?.value || '#78350f',
      },
      // Font colors
      font: {
        primary: tokens.colors.font?.primary?.value || '#1f2937',
        secondary: tokens.colors.font?.secondary?.value || '#6b7280',
        tertiary: tokens.colors.font?.tertiary?.value || '#9ca3af',
        inverse: tokens.colors.font?.inverse?.value || '#ffffff',
        interactive: tokens.colors.font?.interactive?.value || tokens.colors.brand?.primary?.value || '#d97706',
      },
      // Background colors
      background: {
        primary: tokens.colors.background?.primary?.value || '#ffffff',
        secondary: tokens.colors.background?.secondary?.value || '#f9fafb',
        tertiary: tokens.colors.background?.tertiary?.value || '#f3f4f6',
        inverse: tokens.colors.background?.inverse?.value || '#111827',
      },
      // Border colors
      border: {
        primary: tokens.colors.border?.primary?.value || '#e5e7eb',
        secondary: tokens.colors.border?.secondary?.value || '#d1d5db',
        focus: tokens.colors.border?.focus?.value || tokens.colors.brand?.primary?.value || '#d97706',
        error: tokens.colors.border?.error?.value || '#dc2626',
        success: tokens.colors.border?.success?.value || '#059669',
      },
      // Status colors
      success: {
        primary: tokens.colors.success?.primary?.value || '#059669',
        secondary: tokens.colors.success?.secondary?.value || '#d1fae5',
      },
      warning: {
        primary: tokens.colors.warning?.primary?.value || '#f59e0b',
        secondary: tokens.colors.warning?.secondary?.value || '#fef3c7',
      },
      error: {
        primary: tokens.colors.error?.primary?.value || '#dc2626',
        secondary: tokens.colors.error?.secondary?.value || '#fef2f2',
      },
      info: {
        primary: tokens.colors.info?.primary?.value || '#2563eb',
        secondary: tokens.colors.info?.secondary?.value || '#dbeafe',
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
