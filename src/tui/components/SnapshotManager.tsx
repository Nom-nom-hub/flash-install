import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import fs from 'fs-extra';
import path from 'path';
import { snapshot } from '../../snapshot.js';

/**
 * Props for the SnapshotManager component
 */
interface SnapshotManagerProps {
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
 * Snapshot item
 */
interface SnapshotItem {
  /**
   * Snapshot name
   */
  name: string;

  /**
   * Snapshot date
   */
  date: Date;

  /**
   * Snapshot size
   */
  size: number;
}

/**
 * Mode for the snapshot manager
 */
enum Mode {
  LIST = 'LIST',
  CREATE = 'CREATE',
  RESTORE = 'RESTORE',
  DELETE = 'DELETE',
}

/**
 * Snapshot Manager component
 */
const SnapshotManager: React.FC<SnapshotManagerProps> = ({ projectDir, onBack }) => {
  // State
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<Mode>(Mode.LIST);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load snapshots
  useEffect(() => {
    loadSnapshots();
  }, []);

  // Load snapshots from .flashpack directory
  const loadSnapshots = async () => {
    try {
      setLoading(true);
      setError(null);

      const snapshotDir = path.join(projectDir, '.flashpack');

      if (!await fs.pathExists(snapshotDir)) {
        setSnapshots([]);
        setLoading(false);
        return;
      }

      const files = await fs.readdir(snapshotDir);
      const snapshotFiles = files.filter(file => file.endsWith('.snapshot'));

      const snapshotItems: SnapshotItem[] = [];

      for (const file of snapshotFiles) {
        const filePath = path.join(snapshotDir, file);
        const stats = await fs.stat(filePath);

        snapshotItems.push({
          name: file.replace('.snapshot', ''),
          date: stats.mtime,
          size: stats.size,
        });
      }

      // Sort by date (newest first)
      snapshotItems.sort((a, b) => b.date.getTime() - a.date.getTime());

      setSnapshots(snapshotItems);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load snapshots: ${err}`);
      setLoading(false);
    }
  };

  // Handle key press
  useEffect(() => {
    const handleKeyPress = (ch: string, key: { name: string }) => {
      if (mode === Mode.LIST) {
        if (key.name === 'c') {
          setMode(Mode.CREATE);
        } else if (key.name === 'r') {
          setMode(Mode.RESTORE);
        } else if (key.name === 'd') {
          setMode(Mode.DELETE);
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

  // Create a snapshot
  const createSnapshot = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get dependencies from package.json
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);

      // Combine dependencies
      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };

      // Create snapshot
      await snapshot.create(projectDir, dependencies);

      await loadSnapshots();
      setMode(Mode.LIST);
    } catch (err) {
      setError(`Failed to create snapshot: ${err}`);
      setLoading(false);
    }
  };

  // Restore a snapshot
  const restoreSnapshot = async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      await snapshot.restore(projectDir);

      setMode(Mode.LIST);
      setLoading(false);
    } catch (err) {
      setError(`Failed to restore snapshot: ${err}`);
      setLoading(false);
    }
  };

  // Delete a snapshot
  const deleteSnapshot = async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      const snapshotPath = path.join(projectDir, '.flashpack', `${name}.snapshot`);

      await fs.remove(snapshotPath);

      await loadSnapshots();
      setMode(Mode.LIST);
    } catch (err) {
      setError(`Failed to delete snapshot: ${err}`);
      setLoading(false);
    }
  };

  // Format file size
  const formatSize = (size: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let formattedSize = size;
    let unitIndex = 0;

    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }

    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  };

  // Render loading state
  if (loading) {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Loading snapshots...</Text>
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

  // Render list mode
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Snapshots ({snapshots.length})</Text>
      </Box>
      {snapshots.length === 0 ? (
        <Text>No snapshots found</Text>
      ) : (
        <Box flexDirection="column">
          {snapshots.map((snapshot) => (
            <Box key={snapshot.name}>
              <Text color="green">{snapshot.name}</Text>
              <Text color="gray"> - {snapshot.date.toLocaleString()}</Text>
              <Text color="yellow"> ({formatSize(snapshot.size)})</Text>
            </Box>
          ))}
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text>Press C to create, R to restore, D to delete, B to go back</Text>
      </Box>
    </Box>
  );
};

export default SnapshotManager;
