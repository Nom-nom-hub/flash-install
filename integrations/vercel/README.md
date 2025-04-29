# Flash Install for Vercel

<p align="center">
  <img src="https://raw.githubusercontent.com/flash-install-cli/flash-install/main/assets/logo.png" alt="flash-install logo" width="200" height="200">
</p>

<p align="center">
  <b>Blazingly fast dependency installation for Vercel deployments</b>
</p>

## Overview

Flash Install is a drop-in replacement for npm, yarn, and pnpm that dramatically speeds up dependency installation through deterministic caching and parallel operations. When integrated with Vercel, it can reduce build times by 30-50%.

## Features

- **Faster Builds**: Reduce dependency installation time by up to 50%
- **Deterministic Caching**: Smart caching ensures consistent, reliable builds
- **Framework Agnostic**: Works with Next.js, Remix, Astro, SvelteKit, and more
- **Zero Configuration**: Works out of the box with sensible defaults
- **Fallback Safety**: Automatically falls back to npm if any issues occur
- **Team Cache Sharing**: Share dependency caches across team members (Enterprise)
- **Build Analytics**: Track dependency installation performance metrics

## Performance Benchmarks

| Project Type | npm install | flash-install | Improvement |
|--------------|------------|---------------|-------------|
| Next.js App | 45.2s | 22.8s | 49.6% |
| E-commerce (Next.js Commerce) | 120.5s | 58.7s | 51.3% |
| Dashboard (Next.js) | 65.8s | 35.2s | 46.5% |
| Astro Blog | 38.2s | 20.1s | 47.4% |
| SvelteKit App | 42.1s | 23.2s | 44.9% |

## How It Works

The flash-install Vercel integration works by:

1. **Installation**: The plugin installs flash-install during the Vercel build process
2. **Dependency Resolution**: flash-install analyzes your package.json and lockfile
3. **Smart Caching**: Packages are cached based on content hashes for deterministic builds
4. **Parallel Installation**: Dependencies are installed in parallel for maximum speed
5. **Snapshot Creation**: A snapshot is created for even faster future builds

## Setup

### 1. Install the Integration

Install the flash-install integration from the Vercel Marketplace.

### 2. Configure Your Project

The integration works out of the box with zero configuration, but you can customize it by creating a `.flash-install.json` file in your project root:

```json
{
  "cloudCache": true,
  "cloudProvider": "vercel",
  "syncPolicy": "upload-if-missing",
  "concurrency": 10,
  "vercelIntegration": {
    "enabled": true,
    "teamSharing": true,
    "metrics": true
  }
}
```

### 3. View Performance Metrics

After deploying your project, you can view dependency installation metrics in the Vercel dashboard.

## Configuration Options

| Option | Description | Default |
|--------|-------------|--------|
| `cloudCache` | Enable cloud caching | `true` |
| `cloudProvider` | Cloud provider for caching | `"vercel"` |
| `syncPolicy` | Cache synchronization policy | `"upload-if-missing"` |
| `concurrency` | Number of concurrent operations | `10` |
| `vercelIntegration.enabled` | Enable Vercel integration | `true` |
| `vercelIntegration.teamSharing` | Share cache across team | `true` |
| `vercelIntegration.metrics` | Collect performance metrics | `true` |

## Compatibility

Flash Install works with all major JavaScript frameworks and build tools:

- Next.js
- Remix
- Astro
- SvelteKit
- Nuxt
- Create React App
- Vite
- And more!

## Support

If you encounter any issues or have questions, please reach out:

- [GitHub Issues](https://github.com/flash-install-cli/flash-install/issues)
- [Documentation](https://github.com/flash-install-cli/flash-install/blob/main/docs/vercel-integration.md)

## About Flash Install

Flash Install is an open-source project dedicated to making JavaScript dependency management faster and more reliable. Learn more at [github.com/flash-install-cli/flash-install](https://github.com/flash-install-cli/flash-install).