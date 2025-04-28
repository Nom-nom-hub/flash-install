import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { Screen } from '../app.js';

/**
 * Props for the MainMenu component
 */
interface MainMenuProps {
  /**
   * Callback when an option is selected
   */
  onSelect: (screen: Screen) => void;
}

/**
 * Menu item with description
 */
interface MenuItem {
  /**
   * Label to display
   */
  label: string;

  /**
   * Value to return when selected
   */
  value: Screen;

  /**
   * Description of the menu item
   */
  description: string;
}

/**
 * Item component props
 */
interface ItemProps {
  /**
   * Whether the item is selected
   */
  isSelected?: boolean;

  /**
   * Item label
   */
  label: string;
}

/**
 * Main menu component
 */
const MainMenu: React.FC<MainMenuProps> = ({ onSelect }) => {
  // Menu items
  const items: MenuItem[] = [
    {
      label: '📦 Dependency Manager',
      value: Screen.DEPENDENCY_MANAGER,
      description: 'Add, remove, or update dependencies'
    },
    {
      label: '📸 Snapshot Manager',
      value: Screen.SNAPSHOT_MANAGER,
      description: 'Create, restore, or delete snapshots'
    },
    {
      label: '🔍 Dependency Browser',
      value: Screen.DEPENDENCY_BROWSER,
      description: 'Visualize and explore dependencies'
    }
  ];

  // Handle item selection
  const handleSelect = (item: { value: Screen }) => {
    onSelect(item.value);
  };

  // Render menu item
  const ItemComponent: React.FC<ItemProps> = ({ isSelected, label }) => {
    // Find the corresponding menu item to get the description
    const item = items.find(item => item.label === label);

    return (
      <Box>
        <Text color={isSelected ? 'cyan' : undefined} backgroundColor={isSelected ? 'blue' : undefined}>
          {label}
        </Text>
        {item && <Text color="gray"> - {item.description}</Text>}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Select an option:</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} itemComponent={ItemComponent} />
    </Box>
  );
};

export default MainMenu;
