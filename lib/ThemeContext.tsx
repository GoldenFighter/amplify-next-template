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
  
  // Available themes for the owner to choose from
  const availableThemes: ThemePresetKey[] = ['default', 'ocean', 'sunset', 'forest', 'midnight'];

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
    }
  };

  const toggleColorMode = () => {
    if (isOwner) {
      const newMode = colorMode === 'light' ? 'dark' : 'light';
      setColorMode(newMode);
      localStorage.setItem('picfight-color-mode', newMode);
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
