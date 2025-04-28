import React from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../app.js';

/**
 * Props for the Footer component
 */
interface FooterProps {
  /**
   * Active screen
   */
  activeScreen: Screen;
}

/**
 * Footer component for the TUI
 */
const Footer: React.FC<FooterProps> = ({ activeScreen }) => {
  // Get help text based on active screen
  const getHelpText = () => {
    switch (activeScreen) {
      case Screen.MAIN_MENU:
        return 'Use ↑/↓ to navigate, Enter to select, Ctrl+C to exit';
      case Screen.DEPENDENCY_MANAGER:
        return 'Use ↑/↓ to navigate, Enter to select, A to add, R to remove, U to update, B to go back';
      case Screen.SNAPSHOT_MANAGER:
        return 'Use ↑/↓ to navigate, Enter to select, C to create, R to restore, D to delete, B to go back';
      case Screen.DEPENDENCY_BROWSER:
        return 'Use ↑/↓/←/→ to navigate, F to focus, S to search, B to go back';
      default:
        return 'Use Ctrl+C to exit';
    }
  };
  
  return (
    <Box borderStyle="round" borderColor="blue" padding={1} justifyContent="center" width="100%">
      <Text color="blue">{getHelpText()}</Text>
    </Box>
  );
};

export default Footer;
