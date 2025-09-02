"use client";

import { useState, useEffect } from 'react';
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
  Alert,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Loader,
} from '@aws-amplify/ui-react';
import { useTheme } from '../../lib/ThemeContext';
import { themePresets, ThemePresetKey } from '../../lib/theme';
import { getSiteStatistics, saveSiteConfiguration, loadSiteConfiguration, SiteStatistics, SiteConfiguration } from '../../lib/ownerUtils';

// Use the types from ownerUtils
type SiteStats = SiteStatistics;
type SiteConfig = SiteConfiguration;

export default function OwnerDashboard() {
  const { currentTheme, currentThemeName, setTheme, availableThemes, isOwner, colorMode, toggleColorMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    allowNewRegistrations: true,
    maxBoardsPerUser: 10,
    maxSubmissionsPerBoard: 100,
    aiGenerationEnabled: true,
    maintenanceMode: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  console.log('OwnerDashboard - isOwner:', isOwner);
  console.log('OwnerDashboard - currentThemeName:', currentThemeName);

  if (!isOwner) {
    console.log('OwnerDashboard - Not owner, hiding component');
    return null; // Only show to site owner
  }

  // Load real data from the database
  useEffect(() => {
    if (isOwner) {
      setIsLoading(true);
      
      // Load site statistics
      getSiteStatistics()
        .then(stats => {
          setSiteStats(stats);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading site statistics:', error);
          setIsLoading(false);
        });
      
      // Load site configuration
      loadSiteConfiguration()
        .then(config => {
          setSiteConfig(config);
        })
        .catch(error => {
          console.error('Error loading site configuration:', error);
        });
    }
  }, [isOwner]);

  const handleThemeChange = (themeName: string) => {
    console.log('Changing theme to:', themeName);
    setTheme(themeName as ThemePresetKey);
  };

  const handleConfigChange = (key: keyof SiteConfig, value: any) => {
    setSiteConfig(prev => ({
      ...prev,
      [key]: value,
    }));
    console.log(`Config changed: ${key} = ${value}`);
  };

  const saveSiteConfig = async () => {
    setIsLoading(true);
    try {
      await saveSiteConfiguration(siteConfig);
      console.log('Site configuration saved:', siteConfig);
      alert('Site configuration saved successfully!');
    } catch (error) {
      console.error('Error saving site configuration:', error);
      alert('Failed to save site configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getThemePreview = (themeName: ThemePresetKey) => {
    const theme = themePresets[themeName];
    const themeAny = theme as any;
    const primaryColor = themeAny?.tokens?.colors?.primary?.['100']?.value;

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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      {/* Owner Dashboard Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variation="primary"
        size="small"
        className="fixed bottom-4 left-4 z-50 shadow-lg rounded-full p-3 hover:shadow-xl transition-shadow"
        title="Owner Dashboard"
      >
        👑
      </Button>

      {/* Owner Dashboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <Flex direction="column" gap="1rem">
              {/* Header */}
              <Flex justifyContent="space-between" alignItems="center">
                <Flex alignItems="center" gap="0.5rem">
                  <Heading level={3}>👑 Owner Dashboard</Heading>
                  <Badge variation="info" size="small">Site Owner</Badge>
                </Flex>
                <Button
                  variation="link"
                  size="small"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </Button>
              </Flex>

              <Divider />

              {/* Tabs */}
              <Tabs.Container defaultValue="overview">
                <Tabs.List>
                  <Tabs.Item value="overview">Overview</Tabs.Item>
                  <Tabs.Item value="theming">Theming</Tabs.Item>
                  <Tabs.Item value="configuration">Configuration</Tabs.Item>
                  <Tabs.Item value="analytics">Analytics</Tabs.Item>
                </Tabs.List>
                
                <Tabs.Panel value="overview">
                  <Flex direction="column" gap="1rem">
                    <Heading level={4}>Site Overview</Heading>
                    
                    {isLoading ? (
                      <Flex justifyContent="center" padding="2rem">
                        <Loader size="large" />
                      </Flex>
                    ) : siteStats ? (
                      <>
                        {/* Stats Cards */}
                        <Flex gap="1rem" wrap="wrap">
                          <Card className="flex-1 min-w-[200px]">
                            <Flex direction="column" alignItems="center" padding="1rem">
                              <Text fontSize="2rem" fontWeight="bold" color="primary.100">
                                {siteStats.totalBoards}
                              </Text>
                              <Text fontSize="0.875rem" color="gray-600">Total Boards</Text>
                            </Flex>
                          </Card>
                          
                          <Card className="flex-1 min-w-[200px]">
                            <Flex direction="column" alignItems="center" padding="1rem">
                              <Text fontSize="2rem" fontWeight="bold" color="primary.100">
                                {siteStats.totalSubmissions}
                              </Text>
                              <Text fontSize="0.875rem" color="gray-600">Total Submissions</Text>
                            </Flex>
                          </Card>
                          
                          <Card className="flex-1 min-w-[200px]">
                            <Flex direction="column" alignItems="center" padding="1rem">
                              <Text fontSize="2rem" fontWeight="bold" color="primary.100">
                                {siteStats.activeUsers}
                              </Text>
                              <Text fontSize="0.875rem" color="gray-600">Active Users</Text>
                            </Flex>
                          </Card>
                        </Flex>

                        {/* Recent Activity */}
                        <div>
                          <Heading level={5} marginBottom="1rem">Recent Activity</Heading>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Type</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Time</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {siteStats.recentActivity.map((activity) => (
                                <TableRow key={activity.id}>
                                  <TableCell>
                                    <Badge variation="info" size="small">
                                      {activity.type.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{activity.description}</TableCell>
                                  <TableCell>{activity.user}</TableCell>
                                  <TableCell>{formatTimestamp(activity.timestamp)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <Alert variation="info">Loading site statistics...</Alert>
                    )}
                  </Flex>
                </Tabs.Panel>

                <Tabs.Panel value="theming">
                  <Flex direction="column" gap="1rem">
                    <Heading level={4}>Site Theming</Heading>
                    
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
                  </Flex>
                </Tabs.Panel>

                <Tabs.Panel value="configuration">
                  <Flex direction="column" gap="1rem">
                    <Heading level={4}>Site Configuration</Heading>
                    
                    <Alert variation="info">
                      These settings control how the site operates. Changes will affect all users.
                    </Alert>

                    {/* User Registration */}
                    <div>
                      <SwitchField
                        label="Allow New User Registrations"
                        checked={siteConfig.allowNewRegistrations}
                        onChange={(e) => handleConfigChange('allowNewRegistrations', e.target.checked)}
                        size="small"
                      />
                      <Text fontSize="0.75rem" color="gray-500">
                        When disabled, only existing users can access the site
                      </Text>
                    </div>

                    {/* Limits */}
                    <div>
                      <Text fontSize="0.875rem" fontWeight="medium" marginBottom="0.5rem">
                        User Limits:
                      </Text>
                      <Flex gap="1rem" wrap="wrap">
                        <div className="flex-1 min-w-[200px]">
                          <SelectField
                            label="Max Boards per User"
                            value={siteConfig.maxBoardsPerUser.toString()}
                            onChange={(e) => handleConfigChange('maxBoardsPerUser', parseInt(e.target.value))}
                            size="small"
                          >
                            {[5, 10, 15, 20, 25, 50].map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </SelectField>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <SelectField
                            label="Max Submissions per Board"
                            value={siteConfig.maxSubmissionsPerBoard.toString()}
                            onChange={(e) => handleConfigChange('maxSubmissionsPerBoard', parseInt(e.target.value))}
                            size="small"
                          >
                            {[50, 100, 200, 500, 1000].map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </SelectField>
                        </div>
                      </Flex>
                    </div>

                    {/* Features */}
                    <div>
                      <Text fontSize="0.875rem" fontWeight="medium" marginBottom="0.5rem">
                        Feature Toggles:
                      </Text>
                      <Flex direction="column" gap="0.5rem">
                        <SwitchField
                          label="AI Generation Enabled"
                          checked={siteConfig.aiGenerationEnabled}
                          onChange={(e) => handleConfigChange('aiGenerationEnabled', e.target.checked)}
                          size="small"
                        />
                        <SwitchField
                          label="Maintenance Mode"
                          checked={siteConfig.maintenanceMode}
                          onChange={(e) => handleConfigChange('maintenanceMode', e.target.checked)}
                          size="small"
                        />
                      </Flex>
                    </div>

                    <Divider />

                    {/* Save Button */}
                    <Button
                      onClick={saveSiteConfig}
                      variation="primary"
                      isLoading={isLoading}
                      className="self-center"
                    >
                      Save Configuration
                    </Button>
                  </Flex>
                </Tabs.Panel>

                <Tabs.Panel value="analytics">
                  <Flex direction="column" gap="1rem">
                    <Heading level={4}>Site Analytics</Heading>
                    
                    <Alert variation="info">
                      Detailed analytics and reporting features coming soon!
                    </Alert>

                    <Card>
                      <Flex direction="column" gap="1rem" padding="1rem">
                        <Text fontSize="0.875rem" fontWeight="medium">
                          Planned Analytics Features:
                        </Text>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          <li>User engagement metrics</li>
                          <li>Contest performance analytics</li>
                          <li>AI generation usage statistics</li>
                          <li>Popular contest types</li>
                          <li>User retention data</li>
                          <li>Export capabilities</li>
                        </ul>
                      </Flex>
                    </Card>
                  </Flex>
                </Tabs.Panel>
              </Tabs.Container>
            </Flex>
          </Card>
        </div>
      )}
    </>
  );
}
