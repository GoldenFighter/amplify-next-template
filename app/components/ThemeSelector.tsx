"use client";

import { useState } from 'react';
import {
  Card,
  Flex,
  Heading,
  Text,
  Button,
  SelectField,
  SwitchField,
  Divider,
  Badge,
} from '@aws-amplify/ui-react';
import { useTheme } from '../../lib/ThemeContext';
import { themePresets, ThemePresetKey } from '../../lib/theme';

export default function ThemeSelector() {
  const { currentTheme, currentThemeName, setTheme, availableThemes, isOwner, colorMode, toggleColorMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');

  // Debug logging
  console.log('ThemeSelector - isOwner:', isOwner);
  console.log('ThemeSelector - currentThemeName:', currentThemeName);

  if (!isOwner) {
    console.log('ThemeSelector - Not owner, hiding component');
    return null; // Only show to site owner
  }

  const handleThemeChange = (themeName: string) => {
    console.log('Changing theme to:', themeName);
    setTheme(themeName as ThemePresetKey);
    
    // Show notification
    setNotificationText(`Theme changed to ${themeName}!`);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
    
    // Show visual feedback
    const button = document.querySelector(`[title="Switch to ${themeName} theme"]`);
    if (button) {
      button.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
      setTimeout(() => {
        button.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
      }, 1000);
    }
  };

  const getThemePreview = (themeName: ThemePresetKey) => {
    const theme = themePresets[themeName];
    
    // Use type assertion to bypass complex union type issues
    const themeAny = theme as any;
    const primaryColor = themeAny?.tokens?.colors?.brand?.primary?.value;
    
    if (!primaryColor) {
      return (
        <div 
          className="w-6 h-6 rounded-full border-2 border-gray-300 bg-gray-400"
          title={`${themeName} theme (no color defined)`}
        />
      );
    }
    
    return (
      <div 
        className="w-6 h-6 rounded-full border-2 border-gray-300"
        style={{ backgroundColor: primaryColor }}
        title={`${themeName} theme`}
      />
    );
  };

  return (
    <>
      {/* Theme Change Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          {notificationText}
        </div>
      )}

      {/* Theme Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variation="primary"
        size="small"
        className="fixed bottom-4 right-4 z-50 shadow-lg rounded-full p-3 hover:shadow-xl transition-shadow"
        title="Site Theme Settings"
      >
        🎨
      </Button>

      {/* Theme Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <Flex direction="column" gap="1rem">
              <Flex justifyContent="space-between" alignItems="center">
                <Heading level={4}>🎨 Site Theme Settings</Heading>
                <Button
                  variation="link"
                  size="small"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </Button>
              </Flex>

              <Divider />

              <Text fontSize="0.875rem" color="gray-600">
                As the site owner, you can customize the appearance of PicFight.
              </Text>

              {/* Current Theme Display */}
              <div>
                <Text fontSize="0.875rem" fontWeight="medium" marginBottom="0.5rem">
                  Current Theme:
                </Text>
                <Flex alignItems="center" gap="0.5rem">
                  {getThemePreview(currentThemeName as ThemePresetKey)}
                  <Text fontSize="0.875rem" fontWeight="medium" textTransform="capitalize">
                    {currentThemeName}
                  </Text>
                  <Badge variation="info" size="small">Active</Badge>
                </Flex>
              </div>

              <Divider />

              {/* Theme Selection */}
              <div>
                <Text fontSize="0.875rem" fontWeight="medium" marginBottom="0.5rem">
                  Choose Theme:
                </Text>
                <SelectField
                  label="Select a theme"
                  value={currentThemeName}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  size="small"
                >
                  {availableThemes.map((themeName) => (
                    <option key={themeName} value={themeName}>
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </option>
                  ))}
                </SelectField>
              </div>

              {/* Dark Mode Toggle */}
              <div>
                <SwitchField
                  label="Dark Mode"
                  checked={colorMode === 'dark'}
                  onChange={toggleColorMode}
                  size="small"
                />
                <Text fontSize="0.75rem" color="gray-500">
                  Toggle between light and dark appearance
                </Text>
              </div>

              {/* Theme Previews */}
              <div>
                <Text fontSize="0.875rem" fontWeight="medium" marginBottom="0.5rem">
                  Theme Previews:
                </Text>
                <Flex wrap="wrap" gap="0.5rem">
                  {availableThemes.map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => handleThemeChange(themeName)}
                      className={`p-2 rounded border-2 transition-all ${
                        currentThemeName === themeName
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={`Switch to ${themeName} theme`}
                    >
                      <Flex direction="column" alignItems="center" gap="0.25rem">
                        {getThemePreview(themeName)}
                        <Text fontSize="0.75rem" textTransform="capitalize">
                          {themeName}
                        </Text>
                      </Flex>
                    </button>
                  ))}
                </Flex>
              </div>

              <Divider />

              {/* Theme Info */}
              <div>
                <Text fontSize="0.875rem" fontWeight="medium" marginBottom="0.5rem">
                  Theme Details:
                </Text>
                <Text fontSize="0.75rem" color="gray-600">
                  • <strong>Default:</strong> Classic PicFight orange theme
                </Text>
                <Text fontSize="0.75rem" color="gray-600">
                  • <strong>Ocean:</strong> Calming blue tones
                </Text>
                <Text fontSize="0.75rem" color="gray-600">
                  • <strong>Sunset:</strong> Warm orange and amber
                </Text>
                <Text fontSize="0.75rem" color="gray-600">
                  • <strong>Forest:</strong> Natural green palette
                </Text>
                <Text fontSize="0.75rem" color="gray-600">
                  • <strong>Midnight:</strong> Deep blue and dark tones
                </Text>
              </div>

              <Divider />

              {/* Close Button */}
              <Button
                onClick={() => setIsOpen(false)}
                variation="primary"
                size="small"
                className="self-center"
              >
                Close Settings
              </Button>
            </Flex>
          </Card>
        </div>
      )}
    </>
  );
}
