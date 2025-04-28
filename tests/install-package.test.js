// Test script for installing individual packages
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Package Installation Tests', () => {
  let testDir;

  beforeAll(() => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `flash-install-test-${Date.now()}`);
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
  });

  afterAll(() => {
    // Clean up
    console.log(`\nCleaning up test directory: ${testDir}`);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('Install single package', () => {
    const command = `node ${path.resolve(process.cwd(), 'dist/cli.js')} lodash`;
    console.log(`Command: ${command}`);

    execSync(command, {
      cwd: testDir,
      stdio: 'inherit'
    });

    expect(fs.existsSync(path.join(testDir, 'node_modules/lodash'))).toBe(true);
  });

  test('Install package with specific version', () => {
    const command = `node ${path.resolve(process.cwd(), 'dist/cli.js')} express@4.17.1`;
    console.log(`Command: ${command}`);

    execSync(command, {
      cwd: testDir,
      stdio: 'inherit'
    });

    const pkgJson = JSON.parse(fs.readFileSync(path.join(testDir, 'node_modules/express/package.json')));
    expect(pkgJson.version).toBe('4.17.1');
  });

  test('Install package with --save-dev', () => {
    const command = `node ${path.resolve(process.cwd(), 'dist/cli.js')} chalk --save-dev`;
    console.log(`Command: ${command}`);

    execSync(command, {
      cwd: testDir,
      stdio: 'inherit'
    });

    const pkgJson = JSON.parse(fs.readFileSync(path.join(testDir, 'package.json')));
    expect(pkgJson.devDependencies).toBeDefined();
    expect(pkgJson.devDependencies.chalk).toBeDefined();
  });

  test('Install package with --save-exact', () => {
    const command = `node ${path.resolve(process.cwd(), 'dist/cli.js')} moment --save-exact`;
    console.log(`Command: ${command}`);

    execSync(command, {
      cwd: testDir,
      stdio: 'inherit'
    });

    const pkgJson = JSON.parse(fs.readFileSync(path.join(testDir, 'package.json')));
    console.log('Package.json contents:', JSON.stringify(pkgJson, null, 2));

    expect(pkgJson.dependencies).toBeDefined();
    expect(pkgJson.dependencies.moment).toBeDefined();
    expect(pkgJson.dependencies.moment.startsWith('^')).toBe(false);
  });
});
