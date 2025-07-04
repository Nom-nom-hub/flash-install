/**
 * Package installation options
 */
export interface PackageInstallOptions {
  /** Save to dependencies */
  saveToDependencies?: boolean;
  /** Save to dev dependencies */
  saveToDevDependencies?: boolean;
  /** Save exact version */
  saveExact?: boolean;
}

/**
 * Installation options
 */
export interface InstallOptions {
  /** Number of concurrent installations */
  concurrency?: number;
  /** Package manager to use */
  packageManager?: string;
  /** Whether to include dev dependencies */
  includeDevDependencies?: boolean;
  /** Whether to use cache */
  useCache?: boolean;
  /** Whether to use offline mode */
  offline?: boolean;
  /** Registry URL */
  registry?: string;
  /** Whether to skip postinstall scripts */
  skipPostinstall?: boolean;
  /** Workspace options */
  workspace?: WorkspaceOptions;
  /** Enable fast mode (skip plugins/hooks/logging) */
  fastMode?: boolean;
}

/**
 * Workspace options
 */
export interface WorkspaceOptions {
  /** Whether to enable workspace support */
  enabled?: boolean;
  /** Whether to hoist dependencies */
  hoistDependencies?: boolean;
  /** Whether to install packages in parallel */
  parallelInstall?: boolean;
  /** Maximum concurrency for parallel installation */
  maxConcurrency?: number;
  /** Filter to specific workspaces */
  filter?: string[];
}

/**
 * Package dependency
 */
export interface PackageDependency {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package path */
  path: string;
}