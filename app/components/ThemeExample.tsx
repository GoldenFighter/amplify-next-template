"use client";

import React from 'react';
import {
  Card,
  Flex,
  Heading,
  Text,
  Button,
  Badge,
  Alert,
} from '@aws-amplify/ui-react';
import { useThemeTokens } from '../../lib/themeUtils';

/**
 * Example component demonstrating how to use the improved theme system
 * This shows both Amplify UI component variations and custom styling with theme tokens
 */
export default function ThemeExample() {
  const tokens = useThemeTokens();

  return (
    <Card 
      variation="outlined" 
      style={{
        padding: tokens.space.large,
        borderRadius: tokens.radii.medium,
        boxShadow: tokens.shadows.medium,
        backgroundColor: tokens.colors.background.primary,
        borderColor: tokens.colors.border.primary,
      }}
    >
      <Flex direction="column" gap={tokens.space.medium}>
        {/* Header with theme info */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={3} color={tokens.colors.font.primary}>
            Theme System Example
          </Heading>
          <Text color={tokens.colors.font.secondary}>
            Current theme: {tokens.themeName} • Mode: {tokens.colorMode}
          </Text>
        </Flex>

        {/* Color palette demonstration */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Brand Colors
          </Heading>
          <Flex gap={tokens.space.small} wrap="wrap">
            <div
              style={{
                width: '60px',
                height: '40px',
                backgroundColor: tokens.colors.brand.primary,
                borderRadius: tokens.radii.small,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize="0.75rem" color={tokens.colors.font.inverse}>
                Primary
              </Text>
            </div>
            <div
              style={{
                width: '60px',
                height: '40px',
                backgroundColor: tokens.colors.brand.secondary,
                borderRadius: tokens.radii.small,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize="0.75rem" color={tokens.colors.font.inverse}>
                Secondary
              </Text>
            </div>
            <div
              style={{
                width: '60px',
                height: '40px',
                backgroundColor: tokens.colors.brand.tertiary,
                borderRadius: tokens.radii.small,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize="0.75rem" color={tokens.colors.font.inverse}>
                Tertiary
              </Text>
            </div>
          </Flex>
        </Flex>

        {/* Primary color scale */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Primary Color Scale
          </Heading>
          <Flex gap={tokens.space.xs} wrap="wrap">
            {Object.entries(tokens.colors.primary).map(([key, value]) => (
              <div
                key={key}
                style={{
                  width: '50px',
                  height: '30px',
                  backgroundColor: value,
                  borderRadius: tokens.radii.xs,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fontSize="0.6rem" color={parseInt(key) <= 40 ? tokens.colors.font.primary : tokens.colors.font.inverse}>
                  {key}
                </Text>
              </div>
            ))}
          </Flex>
        </Flex>

        {/* Status colors */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Status Colors
          </Heading>
          <Flex gap={tokens.space.small} wrap="wrap">
            <Badge variation="success">Success</Badge>
            <Badge variation="warning">Warning</Badge>
            <Badge variation="error">Error</Badge>
            <Badge variation="info">Info</Badge>
          </Flex>
        </Flex>

        {/* Interactive elements */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Interactive Elements
          </Heading>
          <Flex gap={tokens.space.small} wrap="wrap">
            <Button variation="primary">Primary Button</Button>
            <Button variation="secondary">Secondary Button</Button>
            <Button variation="link">Link Button</Button>
          </Flex>
        </Flex>

        {/* Typography examples */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Typography
          </Heading>
          <Text color={tokens.colors.font.primary} fontSize="1.125rem" fontWeight="bold">
            Primary Text (Bold)
          </Text>
          <Text color={tokens.colors.font.secondary} fontSize="1rem">
            Secondary Text (Regular)
          </Text>
          <Text color={tokens.colors.font.tertiary} fontSize="0.875rem">
            Tertiary Text (Small)
          </Text>
          <Text 
            color={tokens.colors.font.interactive} 
            fontSize="0.875rem"
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
          >
            Interactive Text (Link)
          </Text>
        </Flex>

        {/* Alert examples */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Alert Components
          </Heading>
          <Alert variation="success">
            <Text fontSize="0.875rem">
              This is a success alert using theme colors!
            </Text>
          </Alert>
          <Alert variation="warning">
            <Text fontSize="0.875rem">
              This is a warning alert using theme colors!
            </Text>
          </Alert>
        </Flex>

        {/* Spacing demonstration */}
        <Flex direction="column" gap={tokens.space.small}>
          <Heading level={4} color={tokens.colors.font.primary}>
            Spacing Scale
          </Heading>
          <Flex direction="column" gap={tokens.space.xs}>
            {Object.entries(tokens.space).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: tokens.space.small }}>
                <Text color={tokens.colors.font.secondary} fontSize="0.75rem" style={{ minWidth: '60px' }}>
                  {key}:
                </Text>
                <div
                  style={{
                    height: '20px',
                    width: value,
                    backgroundColor: tokens.colors.brand.primary,
                    borderRadius: tokens.radii.xs,
                  }}
                />
                <Text color={tokens.colors.font.tertiary} fontSize="0.75rem">
                  {value}
                </Text>
              </div>
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
