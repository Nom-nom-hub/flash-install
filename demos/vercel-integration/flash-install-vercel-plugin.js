/**
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
        utils.log(`Detected package manager: ${packageManager}`);
        
        // Read flash-install configuration
        flashInstallConfig = getFlashInstallConfig(workPath);
        utils.log('flash-install configuration loaded');
        
        // Create cache directory if it doesn't exist
        const cacheDir = process.env.FLASH_INSTALL_CACHE_DIR || path.join(process.env.HOME || '/tmp', '.flash-install-cache');
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          utils.log(`Created cache directory: ${cacheDir}`);
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
          flashInstallCmd += ` --package-manager ${packageManager}`;
          flashInstallCmd += ' --concurrency 10'; // Optimize for CI environment
          
          // Add cloud cache if enabled
          if (flashInstallConfig.cloudCache !== false) {
            flashInstallCmd += ' --cloud-cache';
            flashInstallCmd += ' --cloud-provider s3';
            
            if (teamId) {
              flashInstallCmd += ` --team-id ${teamId}`;
            }
            
            if (projectId) {
              flashInstallCmd += ` --cloud-prefix vercel-${projectId}`;
            }
          }
          
          // Execute flash-install
          utils.log(`Running: ${flashInstallCmd}`);
          execSync(flashInstallCmd, { 
            cwd: workPath,
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: 'true'
            }
          });
          
          installTime = (Date.now() - startTime) / 1000;
          utils.log(`flash-install completed successfully in ${installTime.toFixed(2)}s`);
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
          utils.log(`Dependency installation took ${installTime.toFixed(2)} seconds with flash-install`);
          
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
};
