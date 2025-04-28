#!/usr/bin/env node

/**
 * flash-install Vercel Integration Initializer
 * 
 * This script initializes a project for use with flash-install on Vercel.
 * It adds the necessary configuration files and updates package.json.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

console.log(`${colors.bright}${colors.cyan}
⚡ flash-install Vercel Integration Setup
${colors.reset}`);

// Get the current directory
const currentDir = process.cwd();

// Check if this is a Node.js project
if (!fs.existsSync(path.join(currentDir, 'package.json'))) {
  console.error(`${colors.red}Error: No package.json found in the current directory.${colors.reset}`);
  console.error(`Please run this command in a Node.js project directory.`);
  process.exit(1);
}

// Copy the Vercel plugin
console.log(`${colors.yellow}Adding flash-install Vercel plugin...${colors.reset}`);

const pluginContent = `/**
 * flash-install Vercel Build Plugin
 * 
 * This plugin integrates flash-install with Vercel's build system to provide
 * faster dependency installation and intelligent caching.
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// Helper to check if flash-install is installed
function isFlashInstallInstalled() {
  try {
    execSync('flash-install --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Helper to install flash-install
async function installFlashInstall(utils) {
  utils.log('Installing flash-install...');
  try {
    execSync('npm install -g @flash-install/cli@latest', { 
      stdio: ['ignore', 'pipe', 'pipe'] 
    });
    return true;
  } catch (error) {
    utils.log('Failed to install flash-install');
    utils.log(error.message);
    return false;
  }
}

// Helper to detect package manager from lockfiles
function detectPackageManager(workPath) {
  if (fs.existsSync(path.join(workPath, 'yarn.lock'))) {
    return 'yarn';
  } else if (fs.existsSync(path.join(workPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  } else if (fs.existsSync(path.join(workPath, 'bun.lockb'))) {
    return 'bun';
  } else {
    return 'npm';
  }
}

// Helper to read flash-install configuration
function getFlashInstallConfig(workPath) {
  const configPath = path.join(workPath, '.flash-install.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      return {};
    }
  }
  return {};
}

// Main plugin definition
module.exports = {
  name: 'flash-install-vercel-plugin',
  version: '0.1.0',
  
  setup: ({ utils }) => {
    utils.log('Setting up flash-install for faster dependency installation');
    
    let startTime;
    let installTime;
    let packageManager;
    let flashInstallConfig;
    
    return {
      // Hook into the build start
      buildStart: async ({ workPath }) => {
        startTime = Date.now();
        utils.log('Initializing flash-install...');
        
        // Check if flash-install is already installed
        if (!isFlashInstallInstalled()) {
          const installed = await installFlashInstall(utils);
          if (!installed) {
            utils.log('Will use default package manager instead');
            return;
          }
        }
        
        // Detect package manager
        packageManager = detectPackageManager(workPath);
        utils.log(\`Detected package manager: \${packageManager}\`);
        
        // Read flash-install configuration
        flashInstallConfig = getFlashInstallConfig(workPath);
        utils.log('flash-install configuration loaded');
        
        // Create cache directory if it doesn't exist
        const cacheDir = process.env.FLASH_INSTALL_CACHE_DIR || path.join(process.env.HOME || '/tmp', '.flash-install-cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          utils.log(\`Created cache directory: \${cacheDir}\`);
        }
      },
      
      // Replace the dependency installation step
      install: async ({ workPath }) => {
        if (!isFlashInstallInstalled()) {
          utils.log('flash-install not available, using default installation');
          return false; // Let Vercel run the default installation
        }
        
        utils.log('Installing dependencies with flash-install');
        
        try {
          // Prepare flash-install command
          const teamId = process.env.VERCEL_TEAM_ID || '';
          const projectId = process.env.VERCEL_PROJECT_ID || '';
          
          let flashInstallCmd = 'flash-install';
          
          // Add options based on configuration
          flashInstallCmd += ' --no-interactive'; // Always disable interactive mode in CI
          flashInstallCmd += \` --package-manager \${packageManager}\`;
          flashInstallCmd += ' --concurrency 10'; // Optimize for CI environment
          
          // Add cloud cache if enabled
          if (flashInstallConfig.cloudCache !== false) {
            flashInstallCmd += ' --cloud-cache';
            flashInstallCmd += ' --cloud-provider s3';
            
            if (teamId) {
              flashInstallCmd += \` --team-id \${teamId}\`;
            }
            
            if (projectId) {
              flashInstallCmd += \` --cloud-prefix vercel-\${projectId}\`;
            }
          }
          
          // Execute flash-install
          utils.log(\`Running: \${flashInstallCmd}\`);
          execSync(flashInstallCmd, { 
            cwd: workPath,
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: 'true'
            }
          });
          
          installTime = (Date.now() - startTime) / 1000;
          utils.log(\`flash-install completed successfully in \${installTime.toFixed(2)}s\`);
          return true; // Skip the default installation
        } catch (error) {
          utils.log('flash-install encountered an error, falling back to npm');
          utils.log(error.message || 'Unknown error');
          return false; // Let Vercel run the default installation
        }
      },
      
      // Report build metrics
      buildEnd: async ({ workPath, buildResults }) => {
        if (installTime) {
          utils.log(\`Dependency installation took \${installTime.toFixed(2)} seconds with flash-install\`);
          
          // Save metrics for future reference
          try {
            const metricsDir = path.join(workPath, '.vercel', 'flash-install');
            if (!fs.existsSync(metricsDir)) {
              fs.mkdirSync(metricsDir, { recursive: true });
            }
            
            const metrics = {
              timestamp: new Date().toISOString(),
              installTime,
              packageManager,
              teamId: process.env.VERCEL_TEAM_ID || null,
              projectId: process.env.VERCEL_PROJECT_ID || null,
              buildId: process.env.VERCEL_BUILD_ID || null
            };
            
            fs.writeFileSync(
              path.join(metricsDir, 'metrics.json'),
              JSON.stringify(metrics, null, 2)
            );
          } catch (error) {
            utils.log('Failed to save metrics');
          }
        }
      }
    };
  }
};`;

fs.writeFileSync(path.join(currentDir, 'flash-install-vercel-plugin.js'), pluginContent);

// Create or update vercel.json
console.log(`${colors.yellow}Updating Vercel configuration...${colors.reset}`);

let vercelConfig = {};
const vercelConfigPath = path.join(currentDir, 'vercel.json');

if (fs.existsSync(vercelConfigPath)) {
  try {
    vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  } catch (error) {
    console.warn(`${colors.yellow}Warning: Could not parse existing vercel.json. Creating a new one.${colors.reset}`);
  }
}

// Add flash-install configuration
vercelConfig.buildPlugins = vercelConfig.buildPlugins || [];
vercelConfig.buildPlugins.push({
  path: "./flash-install-vercel-plugin.js"
});

vercelConfig['flash-install'] = {
  enabled: true,
  cloudCache: true,
  cloudProvider: "s3",
  teamSharing: true,
  fallbackToNpm: true,
  concurrency: 10,
  metrics: true
};

fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));

// Create flash-install configuration
console.log(`${colors.yellow}Creating flash-install configuration...${colors.reset}`);

const flashInstallConfig = {
  cloudCache: true,
  cloudProvider: "s3",
  syncPolicy: "upload-if-missing",
  concurrency: 10
};

fs.writeFileSync(path.join(currentDir, '.flash-install.json'), JSON.stringify(flashInstallConfig, null, 2));

// Update package.json to add flash-install as a dev dependency
console.log(`${colors.yellow}Adding flash-install to package.json...${colors.reset}`);

const packageJsonPath = path.join(currentDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add flash-install as a dev dependency if not already present
packageJson.devDependencies = packageJson.devDependencies || {};
if (!packageJson.devDependencies['@flash-install/cli']) {
  packageJson.devDependencies['@flash-install/cli'] = "^1.7.0";
}

// Add scripts for Vercel
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['flash-install:vercel'] = "flash-install --no-interactive";

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log(`${colors.green}${colors.bright}
✅ flash-install Vercel integration setup complete!
${colors.reset}`);

console.log(`${colors.cyan}Your project is now configured to use flash-install with Vercel.${colors.reset}`);
console.log(`
Next steps:
1. Commit these changes to your repository:
   ${colors.yellow}git add vercel.json flash-install-vercel-plugin.js .flash-install.json package.json${colors.reset}
   ${colors.yellow}git commit -m "Add flash-install Vercel integration"${colors.reset}

2. Deploy your project to Vercel:
   ${colors.yellow}vercel${colors.reset}

3. Monitor your build logs to see the performance improvement!
`);

console.log(`${colors.magenta}For more information, visit: ${colors.bright}https://github.com/Nom-nom-hub/flash-install${colors.reset}`);
