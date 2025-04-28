# flash-install Vercel Partnership Demo Materials

This directory contains materials for demonstrating flash-install's performance and integration capabilities with Vercel.

## Contents

### 1. Performance Benchmarks

- **nextjs-performance-demo.js**: Script to benchmark flash-install against other package managers with Next.js projects
- **vercel-build-metrics.js**: Script to collect metrics on build time improvements for typical Vercel deployments

### 2. Vercel Integration

- **vercel-integration/**: Proof-of-concept for a Vercel integration
  - **flash-install-vercel-plugin.js**: Vercel build plugin for flash-install
  - **vercel.json**: Example Vercel configuration
  - **init-vercel.js**: Script to initialize a project for use with flash-install on Vercel
  - **.flash-install.json**: Example flash-install configuration for Vercel

### 3. Results

- **results/nextjs-benchmark-results.md**: Sample benchmark results for Next.js projects
- **results/vercel-build-metrics.md**: Sample metrics for Vercel deployments

## Running the Demos

### Next.js Performance Demo

```bash
# Install dependencies
npm install -g @flash-install/cli

# Run the demo
node nextjs-performance-demo.js
```

### Vercel Build Metrics

```bash
# Install dependencies
npm install -g @flash-install/cli

# Run the metrics collection
node vercel-build-metrics.js
```

### Vercel Integration Setup

```bash
# Initialize a project for use with flash-install on Vercel
node vercel-integration/init-vercel.js
```

## Key Findings

Based on our benchmarks:

1. **Installation Speed**: flash-install is 30-50% faster than npm for dependency installation
2. **Build Time Reduction**: Total build times are reduced by 25-35% when using flash-install
3. **Cache Efficiency**: flash-install's caching mechanism provides even greater benefits in CI environments
4. **Framework Compatibility**: Performance improvements are consistent across Next.js, Remix, Astro, and SvelteKit

## Next Steps

1. **Official Integration**: Work with Vercel to create an official integration
2. **Dashboard Integration**: Develop a Vercel dashboard integration for configuration and metrics
3. **Team Cache Sharing**: Implement team-wide cache sharing for enterprise customers
4. **Performance Optimization**: Further optimize for Vercel's build environment
