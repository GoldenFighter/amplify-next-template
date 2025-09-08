"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, Theme } from '@aws-amplify/ui-react';
import { defaultSiteTheme, themePresets, ThemePresetKey } from './theme';

interface ThemeContextType {
  currentTheme: Theme;
  currentThemeName: string;
  setTheme: (themeName: ThemePresetKey) => void;
  availableThemes: ThemePresetKey[];
  isOwner: boolean;
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  userEmail: string;
}

export const PicFightThemeProvider: React.FC<ThemeProviderProps> = ({ children, userEmail }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultSiteTheme);
  const [currentThemeName, setCurrentThemeName] = useState<string>('default');
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  
  // Check if user is the site owner
  const isOwner = userEmail === 'cmacleod5@me.com';
  
  // Debug logging
  console.log('ThemeContext - userEmail:', userEmail);
  console.log('ThemeContext - isOwner:', isOwner);
  console.log('ThemeContext - Expected owner email: cmacleod5@me.com');
  
  // Available themes for the owner to choose from
  const availableThemes: ThemePresetKey[] = ['default', 'ocean', 'sunset', 'forest', 'midnight'];

  // Apply color mode to HTML element for Amplify UI dark mode
  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-amplify-color-mode', colorMode);
    
    // Also add theme name for CSS variable targeting
    htmlElement.setAttribute('data-amplify-theme', currentTheme.name);
    
    console.log('Applied color mode:', colorMode, 'and theme:', currentTheme.name);
  }, [colorMode, currentTheme.name]);

  // Load saved theme and color mode from localStorage
  useEffect(() => {
    if (isOwner) {
      const savedTheme = localStorage.getItem('picfight-theme');
      const savedColorMode = localStorage.getItem('picfight-color-mode') as 'light' | 'dark';
      
      if (savedTheme && themePresets[savedTheme as ThemePresetKey]) {
        setCurrentTheme(themePresets[savedTheme as ThemePresetKey]);
        setCurrentThemeName(savedTheme);
      }
      
      if (savedColorMode) {
        setColorMode(savedColorMode);
      }
    }
  }, [isOwner]);

  const setTheme = (themeName: ThemePresetKey) => {
    if (isOwner && themePresets[themeName]) {
      const newTheme = themePresets[themeName];
      setCurrentTheme(newTheme);
      setCurrentThemeName(themeName);
      localStorage.setItem('picfight-theme', themeName);
      
      // Apply theme immediately to HTML
      document.documentElement.setAttribute('data-amplify-theme', newTheme.name);
    }
  };

  const toggleColorMode = () => {
    if (isOwner) {
      const newMode = colorMode === 'light' ? 'dark' : 'light';
      setColorMode(newMode);
      localStorage.setItem('picfight-color-mode', newMode);
      
      // Apply color mode immediately to HTML
      document.documentElement.setAttribute('data-amplify-color-mode', newMode);
    }
  };

  const contextValue: ThemeContextType = {
    currentTheme,
    currentThemeName,
    setTheme,
    availableThemes,
    isOwner,
    colorMode,
    toggleColorMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={currentTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
