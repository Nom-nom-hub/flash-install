// Test script for installing individual packages
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Create a temporary test directory
const testDir = path.join(os.tmpdir(), `flash-install-test-${Date.now()}`);
console.log(`Creating test directory: ${testDir}`);
fs.mkdirSync(testDir, { recursive: true });

// Create a basic package.json
const packageJson = {
  name: "flash-install-test",
  version: "1.0.0",
  description: "Test for flash-install package installation",
  main: "index.js",
  scripts: {
    test: "echo \"Error: no test specified\" && exit 1"
  },
  keywords: [],
  author: "",
  license: "ISC"
};

fs.writeFileSync(
  path.join(testDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Test cases
const testCases = [
  {
    name: "Install single package",
    command: `node ${path.resolve(process.cwd(), 'dist/cli.js')} lodash`,  // Use absolute path
    verify: () => fs.existsSync(path.join(testDir, 'node_modules/lodash'))
  },
  {
    name: "Install package with specific version",
    command: `node ${path.resolve(process.cwd(), 'dist/cli.js')} express@4.17.1`,
    verify: () => {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(testDir, 'node_modules/express/package.json')));
      return pkgJson.version === '4.17.1';
    }
  },
  {
    name: "Install package with --save-dev",
    command: `node ${path.resolve(process.cwd(), 'dist/cli.js')} chalk --save-dev`,
    verify: () => {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(testDir, 'package.json')));
      return pkgJson.devDependencies && pkgJson.devDependencies.chalk;
    }
  },
  {
    name: "Install package with --save-exact",
    command: `node ${path.resolve(process.cwd(), 'dist/cli.js')} moment --save-exact`,
    verify: () => {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(testDir, 'package.json')));
      console.log('Package.json contents:', JSON.stringify(pkgJson, null, 2));
      
      // Check if dependencies exists and if moment exists in dependencies
      const hasDependencies = !!pkgJson.dependencies;
      const hasMoment = hasDependencies && !!pkgJson.dependencies.moment;
      const versionFormat = hasMoment ? pkgJson.dependencies.moment : 'N/A';
      const isExact = hasMoment && !pkgJson.dependencies.moment.startsWith('^');
      
      console.log('Has dependencies:', hasDependencies);
      console.log('Has moment:', hasMoment);
      console.log('Version format:', versionFormat);
      console.log('Is exact version:', isExact);
      
      return hasDependencies && hasMoment && isExact;
    }
  }
];

// Run tests
let passedTests = 0;
let failedTests = 0;

for (const test of testCases) {
  try {
    console.log(`\n🧪 Running test: ${test.name}`);
    console.log(`Command: ${test.command}`);
    
    execSync(test.command, { 
      cwd: testDir, 
      stdio: 'inherit' 
    });
    
    const passed = test.verify();
    if (passed) {
      console.log(`✅ Test passed: ${test.name}`);
      passedTests++;
    } else {
      console.log(`❌ Test failed: ${test.name}`);
      failedTests++;
    }
  } catch (error) {
    console.error(`❌ Test error: ${test.name}`);
    console.error(error);
    failedTests++;
  }
}

// Summary
console.log(`\n📊 Test Summary:`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

// Clean up
console.log(`\nCleaning up test directory: ${testDir}`);
fs.rmSync(testDir, { recursive: true, force: true });

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);
