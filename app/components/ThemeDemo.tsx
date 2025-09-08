"use client";

import React from 'react';
import { useTheme } from '../../lib/ThemeContext';

/**
 * Component that demonstrates theme changes across the entire site
 * This shows how the theme affects both Amplify UI components and custom elements
 */
export default function ThemeDemo() {
  const { currentTheme, currentThemeName, colorMode, isOwner } = useTheme();

  if (!isOwner) {
    return null; // Only show to site owner
  }

  return (
    <div className="theme-card max-w-4xl mx-auto p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🎨 Theme Demo</h2>
        <p className="text-gray-600 mb-4">
          This section demonstrates how the theme affects the entire site. 
          Current theme: <strong>{currentThemeName}</strong> | 
          Mode: <strong>{colorMode}</strong>
        </p>
      </div>

      {/* Color Palette */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Color Palette</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-lg mx-auto mb-2 border-2 border-gray-300"
              style={{ backgroundColor: 'var(--picfight-brand-primary)' }}
            />
            <p className="text-sm font-medium">Primary</p>
            <p className="text-xs text-gray-500">Brand Color</p>
          </div>
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-lg mx-auto mb-2 border-2 border-gray-300"
              style={{ backgroundColor: 'var(--picfight-brand-secondary)' }}
            />
            <p className="text-sm font-medium">Secondary</p>
            <p className="text-xs text-gray-500">Accent Color</p>
          </div>
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-lg mx-auto mb-2 border-2 border-gray-300"
              style={{ backgroundColor: 'var(--picfight-brand-tertiary)' }}
            />
            <p className="text-sm font-medium">Tertiary</p>
            <p className="text-xs text-gray-500">Error Color</p>
          </div>
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-lg mx-auto mb-2 border-2 border-gray-300"
              style={{ backgroundColor: 'var(--picfight-bg-primary)' }}
            />
            <p className="text-sm font-medium">Background</p>
            <p className="text-xs text-gray-500">Main BG</p>
          </div>
        </div>
      </div>

      {/* Typography Examples */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Typography</h3>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Heading 1 - Main Title</h1>
          <h2 className="text-2xl font-semibold">Heading 2 - Section Title</h2>
          <h3 className="text-xl font-medium">Heading 3 - Subsection</h3>
          <p className="text-base">Regular paragraph text with normal weight.</p>
          <p className="text-sm text-gray-600">Small secondary text for descriptions.</p>
          <p className="text-xs text-gray-500">Extra small tertiary text for captions.</p>
        </div>
      </div>

      {/* Button Examples */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Buttons</h3>
        <div className="flex flex-wrap gap-3">
          <button className="theme-button-primary">
            Primary Button
          </button>
          <button className="theme-button-secondary">
            Secondary Button
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            Neutral Button
          </button>
          <button className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
            Error Button
          </button>
        </div>
      </div>

      {/* Card Examples */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Cards</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="theme-card">
            <h4 className="font-semibold mb-2">Sample Card 1</h4>
            <p className="text-sm text-gray-600 mb-3">
              This card demonstrates the theme's background and border colors.
            </p>
            <button className="theme-button-primary text-sm">
              Action Button
            </button>
          </div>
          <div className="theme-card">
            <h4 className="font-semibold mb-2">Sample Card 2</h4>
            <p className="text-sm text-gray-600 mb-3">
              Notice how the colors change when you switch themes or toggle dark mode.
            </p>
            <button className="theme-button-secondary text-sm">
              Secondary Action
            </button>
          </div>
        </div>
      </div>

      {/* Form Elements */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Form Elements</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Text Input</label>
            <input 
              type="text" 
              placeholder="Enter some text..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Select</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Status Indicators</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">Error</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm">Info</span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Links</h3>
        <div className="space-y-2">
          <p>
            This is a <a href="#" className="underline">regular link</a> that uses the theme colors.
          </p>
          <p>
            Here's a <a href="#" className="font-medium">bold link</a> for emphasis.
          </p>
          <p>
            And a <a href="#" className="text-sm">small link</a> for secondary actions.
          </p>
        </div>
      </div>

      {/* Theme Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Theme Information</h4>
        <div className="text-sm space-y-1">
          <p><strong>Current Theme:</strong> {currentThemeName}</p>
          <p><strong>Color Mode:</strong> {colorMode}</p>
          <p><strong>Theme Name:</strong> {currentTheme.name}</p>
          <p className="text-gray-600">
            Switch themes using the 🎨 button in the bottom-right corner to see these colors change!
          </p>
        </div>
      </div>
    </div>
  );
}
