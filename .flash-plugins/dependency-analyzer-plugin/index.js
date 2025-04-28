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
     * Run before installation
     */
    async preInstall(context) {
      console.log('\n🔌 Dependency Analyzer Plugin: Pre-Installation Hook');
      console.log('📦 Preparing to install dependencies...');
      console.log(`📂 Project directory: ${context.projectDir}`);
    },

    /**
     * Run after installation
     */
    async postInstall(context) {
      console.log('\n🔌 Dependency Analyzer Plugin: Post-Installation Hook');
      console.log('📊 Installation Summary:');
      console.log(`  - Project: ${context.projectDir}`);
      console.log(`  - Package manager: ${context.packageManager || 'unknown'}`);

      // Try to analyze dependencies from package.json
      try {
        // Use ES module imports
        const { readFileSync, existsSync } = await import('fs');
        const { join } = await import('path');
        const packageJsonPath = join(context.projectDir, 'package.json');

        if (existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          const dependencies = packageJson.dependencies || {};
          const devDependencies = packageJson.devDependencies || {};

          // Count dependencies
          const directDepsCount = Object.keys(dependencies).length;
          const devDepsCount = Object.keys(devDependencies).length;
          const totalDepsCount = directDepsCount + devDepsCount;

          console.log('\n📊 Dependency Analysis:');
          console.log(`  - Direct dependencies: ${directDepsCount}`);
          console.log(`  - Dev dependencies: ${devDepsCount}`);
          console.log(`  - Total dependencies: ${totalDepsCount}`);

          // List dependencies
          if (directDepsCount > 0) {
            console.log('\n📦 Direct Dependencies:');
            for (const [name, version] of Object.entries(dependencies)) {
              console.log(`  - ${name}@${version}`);
            }
          }

          if (devDepsCount > 0) {
            console.log('\n🛠️ Dev Dependencies:');
            for (const [name, version] of Object.entries(devDependencies)) {
              console.log(`  - ${name}@${version}`);
            }
          }
        } else {
          console.log('  - No package.json found');
        }
      } catch (error) {
        console.error(`  - Error analyzing dependencies: ${error.message}`);
      }

      console.log('\n✅ Installation completed successfully');
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
