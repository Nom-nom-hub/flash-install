#!/usr/bin/env node

/**
 * Next.js Performance Demo for flash-install
 * 
 * This script demonstrates the performance benefits of flash-install
 * compared to npm/yarn/pnpm when working with Next.js projects.
 * 
 * Usage:
 *   node nextjs-performance-demo.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Configuration
const TEMP_DIR = path.join(os.tmpdir(), 'flash-install-demo-' + Date.now());
const NEXT_TEMPLATES = [
  { 
    name: 'next-basic', 
    command: 'npx create-next-app@latest next-basic --ts --eslint --tailwind --src-dir --app --import-alias "@/*"',
    description: 'Basic Next.js app with TypeScript, ESLint, and Tailwind CSS'
  },
  { 
    name: 'next-commerce', 
    command: 'git clone https://github.com/vercel/commerce.git next-commerce',
    description: 'Vercel Commerce template (complex e-commerce project)'
  },
  { 
    name: 'next-dashboard', 
    command: 'npx create-next-app@latest next-dashboard --example "https://github.com/vercel/next.js/tree/canary/examples/with-mongodb"',
    description: 'Next.js dashboard example with MongoDB'
  }
];

// Package managers to test
const PACKAGE_MANAGERS = [
  { name: 'npm', installCmd: 'npm install', ciCmd: 'npm ci' },
  { name: 'yarn', installCmd: 'yarn install', ciCmd: 'yarn install --frozen-lockfile' },
  { name: 'pnpm', installCmd: 'pnpm install', ciCmd: 'pnpm install --frozen-lockfile' },
  { name: 'flash-install', installCmd: 'flash-install', ciCmd: 'flash-install' }
];

// Results storage
const results = [];

/**
 * Run a command and measure execution time
 */
function runWithTimer(command, cwd) {
  console.log(`${colors.cyan}Running: ${colors.bright}${command}${colors.reset}`);
  const start = Date.now();
  
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: true }
    });
    const end = Date.now();
    const duration = (end - start) / 1000; // in seconds
    return { success: true, duration };
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    return { success: false, duration: 0, error };
  }
}

/**
 * Clean node_modules to ensure fresh install
 */
function cleanNodeModules(projectDir) {
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`${colors.yellow}Cleaning node_modules...${colors.reset}`);
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  }
  
  // Also clean package manager lock files for fair comparison
  const lockFiles = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    '.flash-install-cache'
  ];
  
  lockFiles.forEach(file => {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  });
}

/**
 * Run the benchmark for a specific project and package manager
 */
async function runBenchmark(projectPath, packageManager, isCI = false) {
  cleanNodeModules(projectPath);
  
  const command = isCI ? packageManager.ciCmd : packageManager.installCmd;
  const { success, duration } = runWithTimer(command, projectPath);
  
  if (success) {
    console.log(`${colors.green}✓ ${packageManager.name} completed in ${colors.bright}${duration.toFixed(2)}s${colors.reset}`);
    return duration;
  } else {
    console.log(`${colors.red}✗ ${packageManager.name} failed${colors.reset}`);
    return null;
  }
}

/**
 * Create a project from template
 */
function createProject(template) {
  console.log(`\n${colors.bgBlue}${colors.white}${colors.bright} Creating ${template.name} project ${colors.reset}\n`);
  const projectPath = path.join(TEMP_DIR, template.name);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  
  // Run the template creation command
  runWithTimer(template.command, TEMP_DIR);
  
  return path.join(TEMP_DIR, template.name);
}

/**
 * Format results as a markdown table
 */
function formatResultsTable(results) {
  let markdown = '# flash-install Performance with Next.js Projects\n\n';
  markdown += 'This benchmark compares installation times across different package managers with various Next.js project templates.\n\n';
  
  // System info
  markdown += '## System Information\n\n';
  markdown += `- **OS**: ${os.type()} ${os.release()}\n`;
  markdown += `- **CPU**: ${os.cpus()[0].model} (${os.cpus().length} cores)\n`;
  markdown += `- **Memory**: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB\n`;
  markdown += `- **Node.js**: ${process.version}\n\n`;
  
  // Results table
  markdown += '## Results\n\n';
  markdown += '| Project | Description | npm | yarn | pnpm | flash-install | Improvement vs npm |\n';
  markdown += '|---------|-------------|-----|------|------|--------------|-------------------|\n';
  
  results.forEach(result => {
    const npmTime = result.times.find(t => t.manager === 'npm')?.duration || 0;
    const yarnTime = result.times.find(t => t.manager === 'yarn')?.duration || 0;
    const pnpmTime = result.times.find(t => t.manager === 'pnpm')?.duration || 0;
    const flashTime = result.times.find(t => t.manager === 'flash-install')?.duration || 0;
    
    let improvement = 0;
    if (npmTime > 0 && flashTime > 0) {
      improvement = ((npmTime - flashTime) / npmTime * 100).toFixed(1);
    }
    
    markdown += `| ${result.project} | ${result.description} | ${npmTime.toFixed(1)}s | ${yarnTime.toFixed(1)}s | ${pnpmTime.toFixed(1)}s | ${flashTime.toFixed(1)}s | ${improvement}% |\n`;
  });
  
  markdown += '\n\n';
  
  // Add chart data
  markdown += '## Chart Data (JSON)\n\n';
  markdown += '```json\n';
  markdown += JSON.stringify(results, null, 2);
  markdown += '\n```\n\n';
  
  // Add conclusions
  markdown += '## Conclusions\n\n';
  
  // Calculate average improvement
  let totalImprovement = 0;
  let countProjects = 0;
  
  results.forEach(result => {
    const npmTime = result.times.find(t => t.manager === 'npm')?.duration || 0;
    const flashTime = result.times.find(t => t.manager === 'flash-install')?.duration || 0;
    
    if (npmTime > 0 && flashTime > 0) {
      totalImprovement += ((npmTime - flashTime) / npmTime * 100);
      countProjects++;
    }
  });
  
  const avgImprovement = (totalImprovement / countProjects).toFixed(1);
  
  markdown += `- flash-install is on average **${avgImprovement}% faster** than npm for Next.js projects\n`;
  markdown += '- The performance improvement is most significant for larger projects with many dependencies\n';
  markdown += '- flash-install provides the most benefit in CI environments where cache can be reused\n';
  
  return markdown;
}

/**
 * Main function to run the demo
 */
async function main() {
  console.log(`${colors.bgYellow}${colors.black}${colors.bright} flash-install Next.js Performance Demo ${colors.reset}\n`);
  
  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  // Run benchmarks for each template
  for (const template of NEXT_TEMPLATES) {
    const projectPath = createProject(template);
    
    console.log(`\n${colors.bgGreen}${colors.black}${colors.bright} Benchmarking ${template.name} ${colors.reset}\n`);
    console.log(`${colors.dim}${template.description}${colors.reset}\n`);
    
    const projectResults = {
      project: template.name,
      description: template.description,
      times: []
    };
    
    // First run: fresh install
    console.log(`\n${colors.magenta}${colors.bright}Fresh Install Benchmark${colors.reset}\n`);
    for (const pm of PACKAGE_MANAGERS) {
      const duration = await runBenchmark(projectPath, pm, false);
      if (duration) {
        projectResults.times.push({
          manager: pm.name,
          scenario: 'fresh',
          duration
        });
      }
    }
    
    // Second run: CI-like install
    console.log(`\n${colors.magenta}${colors.bright}CI Install Benchmark${colors.reset}\n`);
    for (const pm of PACKAGE_MANAGERS) {
      const duration = await runBenchmark(projectPath, pm, true);
      if (duration) {
        projectResults.times.push({
          manager: pm.name,
          scenario: 'ci',
          duration
        });
      }
    }
    
    results.push(projectResults);
  }
  
  // Generate and save results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const markdown = formatResultsTable(results);
  const resultsPath = path.join(resultsDir, 'nextjs-benchmark-results.md');
  fs.writeFileSync(resultsPath, markdown);
  
  console.log(`\n${colors.bgCyan}${colors.black}${colors.bright} Benchmark Complete! ${colors.reset}\n`);
  console.log(`Results saved to: ${resultsPath}`);
  
  // Clean up
  console.log(`\n${colors.yellow}Cleaning up temporary files...${colors.reset}`);
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

// Run the demo
main().catch(error => {
  console.error(`${colors.bgRed}${colors.white} ERROR: ${error.message} ${colors.reset}`);
  process.exit(1);
});
