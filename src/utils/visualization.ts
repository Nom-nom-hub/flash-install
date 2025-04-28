/**
 * Visualization utilities for dependency trees
 */

import chalk from 'chalk';
import { DependencyInfo } from '../analysis.js';
import * as fsUtils from './fs.js';

/**
 * Visualization options
 */
export interface VisualizationOptions {
  /** Show dependency sizes */
  showSizes?: boolean;
  /** Show dependency versions */
  showVersions?: boolean;
  /** Show duplicates */
  showDuplicates?: boolean;
  /** Maximum depth to visualize */
  maxDepth?: number;
  /** Use colors */
  useColors?: boolean;
}

/**
 * Default visualization options
 */
const defaultOptions: VisualizationOptions = {
  showSizes: true,
  showVersions: true,
  showDuplicates: true,
  useColors: true
};

/**
 * Generate a tree visualization of dependencies
 * @param dependencies Dependencies to visualize
 * @param options Visualization options
 * @returns Tree visualization as string
 */
export function generateDependencyTree(
  dependencies: Record<string, DependencyInfo>,
  options: VisualizationOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const lines: string[] = [];
  
  // Sort dependencies by name
  const sortedDeps = Object.values(dependencies).sort((a, b) => a.name.localeCompare(b.name));
  
  // Generate tree
  for (const dep of sortedDeps) {
    generateTreeLines(dep, '', true, lines, opts);
  }
  
  return lines.join('\n');
}

/**
 * Generate tree lines for a dependency
 * @param dep Dependency
 * @param prefix Line prefix
 * @param isLast Whether this is the last item in the list
 * @param lines Output lines
 * @param options Visualization options
 */
function generateTreeLines(
  dep: DependencyInfo,
  prefix: string,
  isLast: boolean,
  lines: string[],
  options: VisualizationOptions
): void {
  // Skip if beyond max depth
  if (options.maxDepth !== undefined && dep.depth > options.maxDepth) {
    return;
  }
  
  // Skip duplicates if not showing them
  if (!options.showDuplicates && dep.duplicate) {
    return;
  }
  
  // Generate line
  const connector = isLast ? '└── ' : '├── ';
  let line = `${prefix}${connector}${dep.name}`;
  
  // Add version
  if (options.showVersions) {
    line += options.useColors ? chalk.gray(`@${dep.version}`) : `@${dep.version}`;
  }
  
  // Add size
  if (options.showSizes && dep.size !== undefined) {
    const sizeStr = fsUtils.formatSize(dep.size);
    line += options.useColors ? chalk.cyan(` (${sizeStr})`) : ` (${sizeStr})`;
  }
  
  // Mark duplicates
  if (dep.duplicate && options.useColors) {
    line = chalk.yellow(line) + chalk.yellow(' (duplicate)');
  }
  
  // Mark dev dependencies
  if (dep.dev && options.useColors) {
    line = chalk.gray(line) + chalk.gray(' (dev)');
  }
  
  // Add line
  lines.push(line);
  
  // Process children
  if (dep.dependencies) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    const childDeps = Object.values(dep.dependencies).sort((a, b) => a.name.localeCompare(b.name));
    
    for (let i = 0; i < childDeps.length; i++) {
      const isLastChild = i === childDeps.length - 1;
      generateTreeLines(childDeps[i], childPrefix, isLastChild, lines, options);
    }
  }
}

/**
 * Generate a dependency graph in DOT format (for Graphviz)
 * @param dependencies Dependencies to visualize
 * @param options Visualization options
 * @returns DOT graph as string
 */
export function generateDependencyGraph(
  dependencies: Record<string, DependencyInfo>,
  options: VisualizationOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const lines: string[] = ['digraph DependencyGraph {', '  node [shape=box];'];
  const processedNodes = new Set<string>();
  
  // Process all dependencies
  for (const dep of Object.values(dependencies)) {
    generateGraphNodes(dep, lines, processedNodes, opts);
  }
  
  // Close graph
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate graph nodes for a dependency
 * @param dep Dependency
 * @param lines Output lines
 * @param processedNodes Set of processed nodes
 * @param options Visualization options
 */
function generateGraphNodes(
  dep: DependencyInfo,
  lines: string[],
  processedNodes: Set<string>,
  options: VisualizationOptions
): void {
  // Skip if beyond max depth
  if (options.maxDepth !== undefined && dep.depth > options.maxDepth) {
    return;
  }
  
  // Generate node ID
  const nodeId = `"${dep.name}@${dep.version}"`;
  
  // Skip if already processed
  if (processedNodes.has(nodeId)) {
    return;
  }
  
  // Mark as processed
  processedNodes.add(nodeId);
  
  // Generate node
  let nodeAttrs = '';
  
  if (dep.duplicate) {
    nodeAttrs += ' color=orange';
  }
  
  if (dep.dev) {
    nodeAttrs += ' style=dashed';
  }
  
  if (dep.size !== undefined) {
    const label = `${dep.name}\\n${dep.version}\\n${fsUtils.formatSize(dep.size)}`;
    nodeAttrs += ` label="${label}"`;
  }
  
  // Add node
  lines.push(`  ${nodeId} [${nodeAttrs}];`);
  
  // Process children
  if (dep.dependencies) {
    for (const childDep of Object.values(dep.dependencies)) {
      const childNodeId = `"${childDep.name}@${childDep.version}"`;
      
      // Add edge
      lines.push(`  ${nodeId} -> ${childNodeId};`);
      
      // Process child
      generateGraphNodes(childDep, lines, processedNodes, options);
    }
  }
}

/**
 * Generate a dependency report in Markdown format
 * @param dependencies Dependencies to report
 * @param options Visualization options
 * @returns Markdown report as string
 */
export function generateDependencyReport(
  dependencies: Record<string, DependencyInfo>,
  options: VisualizationOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const lines: string[] = ['# Dependency Report', ''];
  
  // Add summary
  const totalDeps = Object.keys(dependencies).length;
  const totalSize = Object.values(dependencies).reduce((sum, dep) => sum + (dep.size || 0), 0);
  
  lines.push('## Summary', '');
  lines.push(`- **Total Dependencies**: ${totalDeps}`);
  lines.push(`- **Total Size**: ${fsUtils.formatSize(totalSize)}`);
  lines.push('');
  
  // Add dependency table
  lines.push('## Dependencies', '');
  lines.push('| Package | Version | Size | Type |');
  lines.push('| ------- | ------- | ---- | ---- |');
  
  // Sort dependencies by size
  const sortedDeps = Object.values(dependencies)
    .sort((a, b) => (b.size || 0) - (a.size || 0));
  
  // Add rows
  for (const dep of sortedDeps) {
    const size = dep.size !== undefined ? fsUtils.formatSize(dep.size) : 'N/A';
    const type = dep.dev ? 'Dev' : 'Prod';
    lines.push(`| ${dep.name} | ${dep.version} | ${size} | ${type} |`);
  }
  
  return lines.join('\n');
}
