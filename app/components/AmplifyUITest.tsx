"use client";

import {
  Button,
  Card,
  Flex,
  Heading,
  TextField,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function AmplifyUITest() {
  return (
    <Card>
      <Flex direction="column" gap="1rem">
        <Heading level={2}>Amplify UI Test</Heading>
        <TextField
          label="Test Input"
          placeholder="Enter some text"
        />
        <Button variation="primary">
          Test Button
        </Button>
      </Flex>
    </Card>
  );
}
