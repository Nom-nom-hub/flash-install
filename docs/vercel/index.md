---
layout: vercel
title: Flash Install Vercel Integration
description: Accelerate your Vercel builds with Flash Install for faster dependency installation
permalink: /vercel/
---

<p align="center">
  <img src="https://raw.githubusercontent.com/flash-install-cli/flash-install/main/assets/logo.png" alt="Flash Install Logo" width="200" height="200">
</p>

<h1 align="center">Flash Install for Vercel</h1>
<p align="center">Blazingly fast dependency installation for Vercel deployments</p>

<p align="center">
  <a href="https://github.com/flash-install-cli/flash-install/actions/workflows/ci.yml"><img src="https://github.com/flash-install-cli/flash-install/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen.svg" alt="Node.js Version"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/npm/v/@flash-install/cli" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@flash-install/cli"><img src="https://img.shields.io/npm/dm/@flash-install/cli" alt="npm downloads"></a>
</p>

## Overview

Flash Install is a drop-in replacement for npm, yarn, and pnpm that dramatically speeds up dependency installation through deterministic caching and parallel operations. When integrated with Vercel, it can reduce build times by 30-50%.

<div class="cta-buttons">
  <a href="https://vercel.com/integrations/flash-install" class="btn btn-primary">Add to Vercel</a>
  <a href="https://github.com/flash-install-cli/flash-install" class="btn btn-secondary">View on GitHub</a>
</div>

## Features

- **Faster Builds**: Reduce dependency installation time by up to 50%
- **Deterministic Caching**: Smart caching ensures consistent, reliable builds
- **Framework Agnostic**: Works with Next.js, Remix, Astro, SvelteKit, and more
- **Zero Configuration**: Works out of the box with sensible defaults
- **Fallback Safety**: Automatically falls back to npm if any issues occur

## Performance Benchmarks

| Project Type | npm install | flash-install | Improvement |
|--------------|------------|---------------|-------------|
| Next.js App | 45.2s | 22.8s | 49.6% |
| E-commerce (Next.js Commerce) | 120.5s | 58.7s | 51.3% |
| Dashboard (Next.js) | 65.8s | 35.2s | 46.5% |
| Astro Blog | 38.2s | 20.1s | 47.4% |
| SvelteKit App | 42.1s | 23.2s | 44.9% |

## Installation

### From Vercel Marketplace

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to "Integrations" in the sidebar
3. Search for "Flash Install"
4. Click "Add Integration"
5. Select the projects you want to enable Flash Install for
6. Configure the integration settings (or use the defaults)
7. Click "Add Integration"

### Manual Installation

If you prefer to set up the integration manually:

1. Add the Flash Install Vercel plugin to your project:

```bash
npm install --save-dev @flash-install/vercel-plugin
```

2. Create a `vercel.json` file in your project root (or update your existing one):

```json
{
  "buildPlugins": [
    {
      "name": "@flash-install/vercel-plugin",
      "config": {
        "enableCache": true,
        "cacheCompression": true,
        "concurrency": 4,
        "fallbackToNpm": true
      }
    }
  ]
}
```

## Configuration

The Flash Install Vercel integration can be configured with the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableCache` | boolean | `true` | Enable Flash Install's deterministic caching |
| `cacheCompression` | boolean | `true` | Enable compression for cached packages |
| `concurrency` | number | `4` | Number of concurrent package installations |
| `fallbackToNpm` | boolean | `true` | Fall back to npm if Flash Install encounters an error |

## How It Works

The Flash Install Vercel integration works by:

1. **Installation**: The plugin installs Flash Install during the Vercel build process
2. **Dependency Resolution**: Flash Install analyzes your package.json and lockfile
3. **Smart Caching**: Packages are cached based on content hashes for deterministic builds
4. **Parallel Installation**: Dependencies are installed in parallel for maximum speed
5. **Snapshot Creation**: A snapshot is created for even faster future builds

## Documentation

For detailed documentation on the Flash Install Vercel integration, see the [Vercel Integration Guide](./guide).

## Support

If you encounter any issues or have questions, please reach out:

- [GitHub Issues](https://github.com/flash-install-cli/flash-install/issues)
- [Documentation](https://github.com/flash-install-cli/flash-install/blob/main/docs/vercel-integration.md)

## About Flash Install

Flash Install is an open-source project dedicated to making JavaScript dependency management faster and more reliable. Learn more at [github.com/flash-install-cli/flash-install](https://github.com/flash-install-cli/flash-install).
