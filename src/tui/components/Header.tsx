import React from 'react';
import { Box, Text } from 'ink';
import path from 'path';

/**
 * Props for the Header component
 */
interface HeaderProps {
  /**
   * Project directory
   */
  projectDir: string;
}

/**
 * Header component for the TUI
 */
const Header: React.FC<HeaderProps> = ({ projectDir }) => {
  // Get the project name from the directory
  const projectName = path.basename(projectDir);
  
  return (
    <Box borderStyle="round" borderColor="yellow" padding={1} flexDirection="column" width="100%">
      <Box justifyContent="center">
        <Text bold color="yellow">⚡ flash-install Interactive Mode</Text>
      </Box>
      <Box justifyContent="center">
        <Text>Project: </Text>
        <Text color="green">{projectName}</Text>
        <Text> (</Text>
        <Text color="gray">{projectDir}</Text>
        <Text>)</Text>
      </Box>
    </Box>
  );
};

export default Header;
