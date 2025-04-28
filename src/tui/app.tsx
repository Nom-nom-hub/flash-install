import React, { useState } from 'react';
import { Box, Text } from 'ink';
import MainMenu from './components/MainMenu.js';
import DependencyManager from './components/DependencyManager.js';
import SnapshotManager from './components/SnapshotManager.js';
import DependencyBrowser from './components/DependencyBrowser.js';
import Header from './components/Header.js';
import Footer from './components/Footer.js';

/**
 * Available screens in the TUI
 */
export enum Screen {
  MAIN_MENU = 'MAIN_MENU',
  DEPENDENCY_MANAGER = 'DEPENDENCY_MANAGER',
  SNAPSHOT_MANAGER = 'SNAPSHOT_MANAGER',
  DEPENDENCY_BROWSER = 'DEPENDENCY_BROWSER',
}

/**
 * Props for the TUI App
 */
interface AppProps {
  /**
   * Project directory
   */
  projectDir: string;
}

/**
 * Main TUI Application
 */
const App: React.FC<AppProps> = ({ projectDir }) => {
  // Current active screen
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.MAIN_MENU);
  
  // Function to navigate to a different screen
  const navigateTo = (screen: Screen) => {
    setActiveScreen(screen);
  };
  
  // Render the active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case Screen.MAIN_MENU:
        return <MainMenu onSelect={navigateTo} />;
      case Screen.DEPENDENCY_MANAGER:
        return <DependencyManager projectDir={projectDir} onBack={() => navigateTo(Screen.MAIN_MENU)} />;
      case Screen.SNAPSHOT_MANAGER:
        return <SnapshotManager projectDir={projectDir} onBack={() => navigateTo(Screen.MAIN_MENU)} />;
      case Screen.DEPENDENCY_BROWSER:
        return <DependencyBrowser projectDir={projectDir} onBack={() => navigateTo(Screen.MAIN_MENU)} />;
      default:
        return <Text>Unknown screen</Text>;
    }
  };
  
  return (
    <Box flexDirection="column" padding={1}>
      <Header projectDir={projectDir} />
      <Box flexDirection="column" marginY={1}>
        {renderScreen()}
      </Box>
      <Footer activeScreen={activeScreen} />
    </Box>
  );
};

export default App;
