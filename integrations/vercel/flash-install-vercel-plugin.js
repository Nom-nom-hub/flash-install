/**
 * Flash Install Vercel Build Plugin
 *
 * This plugin replaces npm/yarn/pnpm with flash-install during Vercel builds,
 * significantly reducing dependency installation times.
 *
 * @type {import('@vercel/build-utils').BuildPlugin}
 */

// Support both CommonJS and ESM
const plugin = {
  name: 'flash-install-vercel-plugin',
  version: '1.0.0',

  /**
   * Setup function that runs before the build starts
   */
  setup: ({ utils }) => {
    const { log } = utils;

    log.info('Setting up Flash Install for Vercel build...');

    return {
      /**
       * Runs before dependencies are installed
       */
      async beforeInstall({ workPath, installCommand, utils, meta }) {
        const { log, runCommand } = utils;
        const { settings = {} } = meta;

        // Extract settings with defaults
        const enableCache = settings.enableCache !== false;
        const cacheCompression = settings.cacheCompression !== false;
        const concurrency = settings.concurrency || 4;
        const fallbackToNpm = settings.fallbackToNpm !== false;

        log.info('Installing flash-install...');

        try {
          // Install flash-install globally for this build
          await runCommand('npm install -g @flash-install/cli@latest', {
            cwd: workPath,
            env: process.env,
          });

          log.success('Flash Install installed successfully');

          // Determine the original package manager from the install command
          const originalPM = installCommand.startsWith('npm') ? 'npm' :
                            installCommand.startsWith('yarn') ? 'yarn' : 'pnpm';

          // Build the flash-install command with appropriate options
          let flashInstallCommand = 'flash-install';

          if (!enableCache) flashInstallCommand += ' --no-cache';
          if (!cacheCompression) flashInstallCommand += ' --no-cache-compression';
          if (concurrency) flashInstallCommand += ` -c ${concurrency}`;

          // Set the package manager to match the original
          flashInstallCommand += ` -p ${originalPM}`;

          log.info(`Using Flash Install with options: ${flashInstallCommand}`);

          // Return the new install command
          return {
            installCommand: flashInstallCommand,

            // If there's an error and fallback is enabled, use the original command
            fallbackCommand: fallbackToNpm ? installCommand : null,
          };
        } catch (error) {
          log.error('Failed to set up Flash Install:', error);

          if (fallbackToNpm) {
            log.warn('Falling back to original package manager');
            return { installCommand };
          }

          throw error;
        }
      },

      /**
       * Runs after dependencies are installed
       */
      async afterInstall({ workPath, utils }) {
        const { log } = utils;

        log.info('Flash Install completed dependency installation');

        // Optionally create a snapshot for future builds
        try {
          await utils.runCommand('flash-install snapshot --no-cache', {
            cwd: workPath,
            env: process.env,
          });

          log.success('Created Flash Install snapshot for faster future builds');
        } catch (error) {
          // Non-critical error, just log it
          log.warn('Failed to create Flash Install snapshot:', error);
        }
      },

      /**
       * Runs before the build command executes
       */
      async beforeBuild({ workPath, utils }) {
        const { log } = utils;

        // Verify that node_modules is properly installed
        try {
          await utils.runCommand('node -e "require(\'fs\').accessSync(\'node_modules\')"', {
            cwd: workPath,
            env: process.env,
          });

          log.success('Verified node_modules is properly installed');
        } catch (error) {
          log.warn('node_modules verification failed, this may cause build issues');
        }
      },

      /**
       * Runs after the build completes
       */
      async afterBuild({ workPath, utils }) {
        const { log } = utils;

        log.info('Flash Install build process completed');

        // Clean up any temporary files
        try {
          await utils.runCommand('rm -rf .flash-install-temp', {
            cwd: workPath,
            env: process.env,
          });
        } catch (error) {
          // Non-critical error, just log it
          log.debug('Failed to clean up temporary files:', error);
        }
      }
    };
  }
};

// Export for ESM
export default plugin;

// Export for CommonJS
export const setup = plugin.setup;
