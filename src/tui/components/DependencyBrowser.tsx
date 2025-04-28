import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Props for the DependencyBrowser component
 */
interface DependencyBrowserProps {
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
 * Dependency node
 */
interface DependencyNode {
  /**
   * Package name
   */
  name: string;

  /**
   * Package version
   */
  version: string;

  /**
   * Children dependencies
   */
  children: DependencyNode[];

  /**
   * Whether the node is expanded
   */
  expanded: boolean;

  /**
   * Depth in the tree
   */
  depth: number;
}

/**
 * Dependency Browser component
 */
const DependencyBrowser: React.FC<DependencyBrowserProps> = ({ projectDir, onBack }) => {
  // State
  const [dependencies, setDependencies] = useState<DependencyNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [visibleNodes, setVisibleNodes] = useState<DependencyNode[]>([]);

  // Load dependencies
  useEffect(() => {
    loadDependencies();
  }, []);

  // Update visible nodes when dependencies change
  useEffect(() => {
    updateVisibleNodes();
  }, [dependencies]);

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

      // Get direct dependencies
      const directDeps: DependencyNode[] = [];

      // Add regular dependencies
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          directDeps.push({
            name,
            version: version as string,
            children: [],
            expanded: false,
            depth: 0,
          });
        });
      }

      // Add dev dependencies
      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          directDeps.push({
            name,
            version: version as string,
            children: [],
            expanded: false,
            depth: 0,
          });
        });
      }

      // Sort by name
      directDeps.sort((a, b) => a.name.localeCompare(b.name));

      setDependencies(directDeps);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load dependencies: ${err}`);
      setLoading(false);
    }
  };

  // Update visible nodes
  const updateVisibleNodes = () => {
    const nodes: DependencyNode[] = [];

    // Recursive function to add visible nodes
    const addVisibleNodes = (node: DependencyNode) => {
      nodes.push(node);

      if (node.expanded) {
        node.children.forEach(child => {
          addVisibleNodes(child);
        });
      }
    };

    // Add all visible nodes
    dependencies.forEach(dep => {
      addVisibleNodes(dep);
    });

    setVisibleNodes(nodes);

    // Adjust selected index if needed
    if (selectedIndex >= nodes.length) {
      setSelectedIndex(Math.max(0, nodes.length - 1));
    }
  };

  // Toggle node expansion
  const toggleNodeExpansion = (index: number) => {
    const node = visibleNodes[index];

    // Find the node in the original tree
    const findAndToggleNode = (nodes: DependencyNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === node) {
          // Toggle expansion
          nodes[i].expanded = !nodes[i].expanded;

          // Load children if needed
          if (nodes[i].expanded && nodes[i].children.length === 0) {
            loadNodeChildren(nodes[i]);
          }

          return true;
        }

        if (nodes[i].children.length > 0 && findAndToggleNode(nodes[i].children)) {
          return true;
        }
      }

      return false;
    };

    findAndToggleNode(dependencies);

    // Update dependencies to trigger re-render
    setDependencies([...dependencies]);
  };

  // Load node children
  const loadNodeChildren = (node: DependencyNode) => {
    try {
      // This is a simplified version - in a real implementation, you would
      // use npm list or similar to get the actual dependency tree

      // For now, just add some dummy children
      node.children = [
        {
          name: `${node.name}-child-1`,
          version: '1.0.0',
          children: [],
          expanded: false,
          depth: node.depth + 1,
        },
        {
          name: `${node.name}-child-2`,
          version: '2.0.0',
          children: [],
          expanded: false,
          depth: node.depth + 1,
        },
      ];
    } catch (err) {
      setError(`Failed to load dependencies for ${node.name}: ${err}`);
    }
  };

  // Handle key press
  useEffect(() => {
    const handleKeyPress = (ch: string, key: { name: string }) => {
      if (key.name === 'up') {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.name === 'down') {
        setSelectedIndex(Math.min(visibleNodes.length - 1, selectedIndex + 1));
      } else if (key.name === 'return') {
        toggleNodeExpansion(selectedIndex);
      } else if (key.name === 'b') {
        onBack();
      }
    };

    process.stdin.on('keypress', handleKeyPress);

    return () => {
      process.stdin.removeListener('keypress', handleKeyPress);
    };
  }, [selectedIndex, visibleNodes, onBack]);

  // Render loading state
  if (loading) {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Loading dependency tree...</Text>
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

  // Render dependency tree
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Dependency Tree</Text>
      </Box>
      {visibleNodes.length === 0 ? (
        <Text>No dependencies found</Text>
      ) : (
        <Box flexDirection="column" height={20}>
          {visibleNodes.map((node, index) => {
            const isSelected = index === selectedIndex;
            const prefix = '  '.repeat(node.depth);
            const expandChar = node.children.length > 0 ? (node.expanded ? '▼' : '▶') : ' ';

            return (
              <Box key={`${node.name}-${node.depth}-${index}`}>
                <Text color={isSelected ? 'cyan' : undefined} backgroundColor={isSelected ? 'blue' : undefined}>
                  {prefix}{expandChar} {node.name}@{node.version}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text>Use ↑/↓ to navigate, Enter to expand/collapse, B to go back</Text>
      </Box>
    </Box>
  );
};

export default DependencyBrowser;
