// Add this to your types file
export interface PackageInstallOptions {
  saveToDependencies?: boolean;
  saveToDevDependencies?: boolean;
  saveExact?: boolean;
}

// Update your InstallOptions interface to include registry
export interface InstallOptions {
  // ... existing properties
  registry?: string;
}