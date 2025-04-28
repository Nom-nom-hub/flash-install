/**
 * Dependency Analyzer Plugin for flash-install
 * 
 * This plugin analyzes dependencies and provides insights about them.
 */
export default {
  name: 'dependency-analyzer-plugin',
  version: '1.0.0',
  description: 'Analyzes dependencies and provides insights',
  author: 'flash-install team',
  homepage: 'https://github.com/Nom-nom-hub/flash-install',
  repository: 'https://github.com/Nom-nom-hub/flash-install',
  license: 'MIT',
  
  // Plugin configuration
  config: {
    enabled: true,
    priority: 10,
    reportLevel: 'info'
  },
  
  // Plugin hooks
  hooks: {
    /**
     * Run after dependency resolution
     */
    async postDependencyResolution(context) {
      console.log('🔍 Analyzing dependencies...');
      
      const dependencies = context.dependencies || {};
      const devDependencies = context.devDependencies || {};
      
      // Count dependencies
      const directDepsCount = Object.keys(dependencies).length;
      const devDepsCount = Object.keys(devDependencies).length;
      const totalDepsCount = directDepsCount + devDepsCount;
      
      console.log(`📊 Dependency Analysis:`);
      console.log(`  - Direct dependencies: ${directDepsCount}`);
      console.log(`  - Dev dependencies: ${devDepsCount}`);
      console.log(`  - Total dependencies: ${totalDepsCount}`);
      
      // Check for potential issues
      const issues = [];
      
      // Check for large dependencies
      const largeDeps = Object.entries(dependencies)
        .filter(([name]) => ['webpack', 'babel', 'typescript', 'react'].includes(name));
      
      if (largeDeps.length > 0) {
        issues.push(`Large dependencies detected: ${largeDeps.map(([name]) => name).join(', ')}`);
      }
      
      // Check for duplicate dependencies with different versions
      const allDeps = { ...dependencies, ...devDependencies };
      const depNames = new Set(Object.keys(allDeps));
      const duplicates = [];
      
      for (const name of depNames) {
        if (dependencies[name] && devDependencies[name] && dependencies[name] !== devDependencies[name]) {
          duplicates.push(`${name} (${dependencies[name]} vs ${devDependencies[name]})`);
        }
      }
      
      if (duplicates.length > 0) {
        issues.push(`Duplicate dependencies with different versions: ${duplicates.join(', ')}`);
      }
      
      // Report issues
      if (issues.length > 0) {
        console.log('\n⚠️ Potential issues:');
        for (const issue of issues) {
          console.log(`  - ${issue}`);
        }
      } else {
        console.log('\n✅ No potential issues detected');
      }
    },
    
    /**
     * Run after installation
     */
    async postInstall(context) {
      console.log('\n📝 Installation Summary:');
      console.log(`  - Project: ${context.projectDir}`);
      console.log(`  - Package manager: ${context.packageManager}`);
      
      if (context.networkAvailable) {
        console.log(`  - Network: Available`);
      } else {
        console.log(`  - Network: Offline mode`);
      }
      
      if (context.cacheEnabled) {
        console.log(`  - Cache: Enabled`);
      } else {
        console.log(`  - Cache: Disabled`);
      }
      
      if (context.cloudCache?.enabled) {
        console.log(`  - Cloud cache: Enabled (${context.cloudCache.provider})`);
      } else {
        console.log(`  - Cloud cache: Disabled`);
      }
    }
  },
  
  /**
   * Initialize plugin
   */
  async init(context) {
    console.log('🔌 Initializing dependency analyzer plugin...');
    return true;
  },
  
  /**
   * Clean up plugin
   */
  async cleanup(context) {
    console.log('🧹 Cleaning up dependency analyzer plugin...');
    return true;
  }
};
