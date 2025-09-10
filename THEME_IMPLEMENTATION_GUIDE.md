# PicFight Theme Implementation Guide

## Overview

This document explains how PicFight implements theming using AWS Amplify UI's theming system, following best practices from the [Amplify UI Theming Documentation](https://ui.docs.amplify.aws/react/theming).

## Current Implementation Status

### ✅ **What We're Doing Right**

1. **Proper Theme Structure**: Using Amplify UI's `Theme` type with correct token structure
2. **ThemeProvider Integration**: Properly wrapping the app with both Amplify's `ThemeProvider` and custom `PicFightThemeProvider`
3. **Design Token References**: Using proper `{ value: '...' }` syntax and token references
4. **Dark Mode Support**: Implementing dark mode overrides correctly
5. **CSS Variables**: Importing `@aws-amplify/ui-react/styles.css` for CSS variable support

### 🔄 **Improvements Made**

1. **Enhanced Token Coverage**: Added comprehensive token coverage including:
   - Complete color scales (primary, brand, status colors)
   - Typography tokens (font colors, hierarchy)
   - Spacing tokens (xs, small, medium, large, xl, xxl)
   - Border radius tokens
   - Shadow tokens
   - Background colors

2. **Token References**: Using proper token reference syntax:
   ```typescript
   font: {
     primary: { value: '{colors.neutral.100.value}' },
     interactive: { value: '{colors.brand.primary.value}' },
   }
   ```

3. **Theme Utilities**: Created `useThemeTokens()` hook for easy access to theme values
4. **Better Theme Presets**: Enhanced theme presets with complete token coverage
5. **Type Safety**: Proper TypeScript types throughout

## File Structure

```
lib/
├── theme.ts              # Theme definitions and presets
├── themeUtils.ts         # Utility functions for theme access
└── ThemeContext.tsx      # React context for theme management

app/components/
├── ThemeSelector.tsx     # Theme selection component
└── ThemeExample.tsx      # Example component showing theme usage
```

## Usage Examples

### 1. Using Theme Tokens in Components

```tsx
import { useThemeTokens } from '../lib/themeUtils';

function MyComponent() {
  const tokens = useThemeTokens();
  
  return (
    <div style={{
      backgroundColor: tokens.colors.background.primary,
      color: tokens.colors.font.primary,
      padding: tokens.space.medium,
      borderRadius: tokens.radii.medium,
      boxShadow: tokens.shadows.small,
    }}>
      <h2 style={{ color: tokens.colors.brand.primary }}>
        Themed Content
      </h2>
    </div>
  );
}
```

### 2. Using Amplify UI Components with Variations

```tsx
import { Button, Card, Text } from '@aws-amplify/ui-react';

function MyComponent() {
  return (
    <Card variation="outlined">
      <Text color="font.primary">Primary text</Text>
      <Text color="font.secondary">Secondary text</Text>
      <Button variation="primary">Primary Button</Button>
      <Button variation="secondary">Secondary Button</Button>
    </Card>
  );
}
```

### 3. Using the Theme Context

```tsx
import { useTheme } from '../lib/ThemeContext';

function ThemeAwareComponent() {
  const { currentTheme, setTheme, colorMode, toggleColorMode } = useTheme();
  
  return (
    <div>
      <p>Current theme: {currentTheme.name}</p>
      <p>Color mode: {colorMode}</p>
      <button onClick={() => setTheme('ocean')}>Switch to Ocean</button>
      <button onClick={toggleColorMode}>Toggle Dark Mode</button>
    </div>
  );
}
```

## Theme Structure

### Base Theme (`baseTheme`)

The base theme defines the foundation with:
- Brand colors (primary, secondary, tertiary)
- Primary color scale (10-100)
- Font color hierarchy
- Background colors
- Border colors
- Status colors (success, warning, error, info)
- Spacing scale
- Border radius scale
- Shadow definitions

### Theme Presets

Available theme presets:
- **default**: Orange-based theme
- **ocean**: Blue-based theme
- **sunset**: Orange/yellow-based theme
- **forest**: Green-based theme
- **midnight**: Dark blue-based theme

### Dark Mode Support

Each theme includes dark mode overrides that automatically adjust:
- Background colors (light to dark)
- Font colors (dark to light)
- Border colors for proper contrast

## Best Practices

### 1. Use Theme Tokens Instead of Hardcoded Values

❌ **Don't do this:**
```tsx
<div style={{ color: '#6b7280', padding: '1rem' }}>
```

✅ **Do this:**
```tsx
const tokens = useThemeTokens();
<div style={{ color: tokens.colors.font.secondary, padding: tokens.space.medium }}>
```

### 2. Leverage Amplify UI Component Variations

❌ **Don't do this:**
```tsx
<Button style={{ backgroundColor: '#d97706' }}>Click me</Button>
```

✅ **Do this:**
```tsx
<Button variation="primary">Click me</Button>
```

### 3. Use Token References for Maintainability

❌ **Don't do this:**
```typescript
font: {
  primary: { value: '#1f2937' },
  interactive: { value: '#d97706' },
}
```

✅ **Do this:**
```typescript
font: {
  primary: { value: '{colors.neutral.100.value}' },
  interactive: { value: '{colors.brand.primary.value}' },
}
```

## CSS Variables

Amplify UI generates CSS variables that you can use directly in CSS:

```css
.my-custom-component {
  background-color: var(--amplify-colors-background-primary);
  color: var(--amplify-colors-font-primary);
  padding: var(--amplify-space-medium);
  border-radius: var(--amplify-radii-medium);
}
```

## Migration Guide

### From Hardcoded Values to Theme Tokens

1. **Replace hardcoded colors:**
   ```tsx
   // Before
   <div style={{ color: 'gray-600' }}>
   
   // After
   const tokens = useThemeTokens();
   <div style={{ color: tokens.colors.font.secondary }}>
   ```

2. **Replace hardcoded spacing:**
   ```tsx
   // Before
   <div style={{ padding: '1rem', margin: '0.5rem' }}>
   
   // After
   const tokens = useThemeTokens();
   <div style={{ padding: tokens.space.medium, margin: tokens.space.small }}>
   ```

3. **Use component variations:**
   ```tsx
   // Before
   <Button style={{ backgroundColor: '#d97706' }}>Click me</Button>
   
   // After
   <Button variation="primary">Click me</Button>
   ```

## Future Enhancements

1. **Component Token Overrides**: Add component-specific token overrides
2. **Responsive Theming**: Add breakpoint-specific theme variations
3. **Animation Tokens**: Add transition and animation tokens
4. **Custom Properties**: Add custom CSS properties for advanced styling
5. **Theme Validation**: Add runtime theme validation

## Resources

- [Amplify UI Theming Documentation](https://ui.docs.amplify.aws/react/theming)
- [Design Tokens Specification](https://tr.designtokens.org/format/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
