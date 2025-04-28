import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Props for the DependencyManager component
 */
interface DependencyManagerProps {
  /**
   * Project directory
   */
  projectDir: string;

  /**
   * Callback when back button is pressed
   */
  onBack: () => void;
}

/**
 * Dependency item
 */
interface DependencyItem {
  /**
   * Package name
   */
  name: string;

  /**
   * Package version
   */
  version: string;

  /**
   * Whether this is a dev dependency
   */
  isDev: boolean;
}

/**
 * Mode for the dependency manager
 */
enum Mode {
  LIST = 'LIST',
  ADD = 'ADD',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
}

/**
 * Dependency Manager component
 */
const DependencyManager: React.FC<DependencyManagerProps> = ({ projectDir, onBack }) => {
  // State
  const [dependencies, setDependencies] = useState<DependencyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<Mode>(Mode.LIST);
  const [packageName, setPackageName] = useState<string>('');
  const [isDev, setIsDev] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load dependencies
  useEffect(() => {
    loadDependencies();
  }, []);

  // Load dependencies from package.json
  const loadDependencies = async () => {
    try {
      setLoading(true);
      setError(null);

      const packageJsonPath = path.join(projectDir, 'package.json');

      if (!await fs.pathExists(packageJsonPath)) {
        setError('package.json not found');
        setLoading(false);
        return;
      }

      const packageJson = await fs.readJson(packageJsonPath);

      const deps: DependencyItem[] = [];

      // Add regular dependencies
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          deps.push({
            name,
            version: version as string,
            isDev: false,
          });
        });
      }

      // Add dev dependencies
      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          deps.push({
            name,
            version: version as string,
            isDev: true,
          });
        });
      }

      // Sort by name
      deps.sort((a, b) => a.name.localeCompare(b.name));

      setDependencies(deps);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load dependencies: ${err}`);
      setLoading(false);
    }
  };

  // Handle key press
  useEffect(() => {
    const handleKeyPress = (ch: string, key: { name: string }) => {
      if (mode === Mode.LIST) {
        if (key.name === 'a') {
          setMode(Mode.ADD);
        } else if (key.name === 'r') {
          setMode(Mode.REMOVE);
        } else if (key.name === 'u') {
          setMode(Mode.UPDATE);
        } else if (key.name === 'b') {
          onBack();
        }
      }
    };

    process.stdin.on('keypress', handleKeyPress);

    return () => {
      process.stdin.removeListener('keypress', handleKeyPress);
    };
  }, [mode, onBack]);

  // Add a dependency
  const addDependency = async () => {
    try {
      setLoading(true);
      setError(null);

      const command = `npm install ${packageName} ${isDev ? '--save-dev' : '--save'}`;

      execSync(command, { cwd: projectDir, stdio: 'ignore' });

      await loadDependencies();
      setMode(Mode.LIST);
      setPackageName('');
    } catch (err) {
      setError(`Failed to add dependency: ${err}`);
      setLoading(false);
    }
  };

  // Remove a dependency
  const removeDependency = async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      const command = `npm uninstall ${name}`;

      execSync(command, { cwd: projectDir, stdio: 'ignore' });

      await loadDependencies();
    } catch (err) {
      setError(`Failed to remove dependency: ${err}`);
      setLoading(false);
    }
  };

  // Update a dependency
  const updateDependency = async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      const command = `npm update ${name}`;

      execSync(command, { cwd: projectDir, stdio: 'ignore' });

      await loadDependencies();
    } catch (err) {
      setError(`Failed to update dependency: ${err}`);
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Loading dependencies...</Text>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text>Press B to go back</Text>
      </Box>
    );
  }

  // Render add mode
  if (mode === Mode.ADD) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Add Dependency</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Package name: </Text>
          <TextInput
            value={packageName}
            onChange={setPackageName}
            onSubmit={addDependency}
          />
        </Box>
        <Box marginBottom={1}>
          <Text>Dev dependency? </Text>
          <Text color={isDev ? 'green' : 'red'}>{isDev ? 'Yes' : 'No'}</Text>
          <Text> (Press D to toggle)</Text>
        </Box>
        <Box marginTop={1}>
          <Text>Press Enter to add, Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Render list mode
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Dependencies ({dependencies.length})</Text>
      </Box>
      {dependencies.length === 0 ? (
        <Text>No dependencies found</Text>
      ) : (
        <Box flexDirection="column">
          {dependencies.map((dep) => (
            <Box key={dep.name}>
              <Text color={dep.isDev ? 'yellow' : 'green'}>{dep.name}</Text>
              <Text color="gray">@{dep.version}</Text>
              <Text color={dep.isDev ? 'yellow' : 'green'}> ({dep.isDev ? 'dev' : 'prod'})</Text>
            </Box>
          ))}
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text>Press A to add, R to remove, U to update, B to go back</Text>
      </Box>
    </Box>
  );
};

export default DependencyManager;
