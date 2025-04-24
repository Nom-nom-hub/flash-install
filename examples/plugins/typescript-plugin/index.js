import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * TypeScript Plugin for flash-install
 * 
 * This plugin automatically generates TypeScript declaration files
 * for installed packages that don't include them.
 */
export default {
  name: 'typescript-plugin',
  version: '1.0.0',
  description: 'Automatically generates TypeScript declaration files for packages',
  author: 'flash-install team',
  hooks: {
    /**
     * Run after installation is complete
     */
    async postInstall(context) {
      const { projectDir, nodeModulesPath } = context;
      
      // Check if this is a TypeScript project
      const tsconfigPath = path.join(projectDir, 'tsconfig.json');
      if (!fs.existsSync(tsconfigPath)) {
        // Not a TypeScript project, skip
        return;
      }
      
      console.log('🔍 TypeScript plugin: Checking for missing declaration files...');
      
      // Get all packages in node_modules
      const packages = await getDirectPackages(nodeModulesPath);
      let generatedCount = 0;
      
      for (const pkg of packages) {
        const packagePath = path.join(nodeModulesPath, pkg);
        const packageJsonPath = path.join(packagePath, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
          continue;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Skip if package already has types or typings field
        if (packageJson.types || packageJson.typings) {
          continue;
        }
        
        // Check if package has .d.ts files
        const hasDtsFiles = checkForDtsFiles(packagePath);
        if (hasDtsFiles) {
          continue;
        }
        
        // Generate declaration files using dts-gen
        try {
          console.log(`📝 Generating types for ${pkg}...`);
          
          // Create a temporary directory for generation
          const tempDir = path.join(projectDir, '.flash-install-temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }
          
          // Check if dts-gen is installed
          try {
            execSync('npx dts-gen --help', { stdio: 'ignore' });
          } catch (error) {
            console.log('📦 Installing dts-gen...');
            execSync('npm install -g dts-gen', { stdio: 'ignore' });
          }
          
          // Generate declaration file
          execSync(`npx dts-gen -m ${pkg} -o`, { cwd: tempDir, stdio: 'ignore' });
          
          // Copy generated file to package directory
          const generatedFile = path.join(tempDir, `${pkg}.d.ts`);
          if (fs.existsSync(generatedFile)) {
            const targetFile = path.join(packagePath, 'index.d.ts');
            fs.copyFileSync(generatedFile, targetFile);
            generatedCount++;
          }
          
          // Clean up
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (error) {
          console.error(`❌ Failed to generate types for ${pkg}: ${error.message}`);
        }
      }
      
      if (generatedCount > 0) {
        console.log(`✅ Generated TypeScript declarations for ${generatedCount} packages`);
      } else {
        console.log('✅ All packages have TypeScript declarations');
      }
    }
  }
};

/**
 * Get all direct packages in node_modules
 */
async function getDirectPackages(nodeModulesPath) {
  if (!fs.existsSync(nodeModulesPath)) {
    return [];
  }
  
  const entries = fs.readdirSync(nodeModulesPath);
  const packages = [];
  
  for (const entry of entries) {
    // Skip hidden files and special directories
    if (entry.startsWith('.') || entry === 'node_modules') {
      continue;
    }
    
    // Handle scoped packages
    if (entry.startsWith('@')) {
      const scopePath = path.join(nodeModulesPath, entry);
      const scopedEntries = fs.readdirSync(scopePath);
      
      for (const scopedEntry of scopedEntries) {
        packages.push(`${entry}/${scopedEntry}`);
      }
    } else {
      packages.push(entry);
    }
  }
  
  return packages;
}

/**
 * Check if a package has .d.ts files
 */
function checkForDtsFiles(packagePath) {
  const files = fs.readdirSync(packagePath);
  
  for (const file of files) {
    if (file.endsWith('.d.ts')) {
      return true;
    }
  }
  
  return false;
}
