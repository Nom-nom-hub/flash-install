---
layout: vercel
title: Flash Install Vercel Integration Guide
description: Detailed guide for using Flash Install with Vercel
permalink: /vercel/guide/
---

<p align="center">
  <img src="https://raw.githubusercontent.com/flash-install-cli/flash-install/main/assets/logo.png" alt="Flash Install Logo" width="150" height="150">
</p>

<h1 align="center">Flash Install Vercel Integration Guide</h1>

<p align="center">
  <a href="./">Back to Overview</a>
</p>

This guide provides detailed instructions on how to use the Flash Install integration with Vercel to accelerate your build times.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Performance Benefits](#performance-benefits)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)
- [FAQ](#faq)

## Overview

Flash Install is a drop-in replacement for npm, yarn, and pnpm that dramatically speeds up dependency installation through deterministic caching and parallel operations. When integrated with Vercel, it can reduce build times by 30-50%.

The Vercel integration allows you to:

- Automatically use Flash Install for all your Vercel deployments
- Configure caching and performance settings
- Monitor installation performance
- Share dependency caches across your team (Enterprise feature)

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

### Updating Configuration

You can update your configuration at any time:

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to "Integrations" in the sidebar
3. Find "Flash Install" and click "Configure"
4. Update your settings
5. Click "Save"

## How It Works

The Flash Install Vercel integration works by:

1. **Installation**: The plugin installs Flash Install during the Vercel build process
2. **Dependency Resolution**: Flash Install analyzes your package.json and lockfile
3. **Smart Caching**: Packages are cached based on content hashes for deterministic builds
4. **Parallel Installation**: Dependencies are installed in parallel for maximum speed
5. **Snapshot Creation**: A snapshot is created for even faster future builds

### Build Process

When you deploy your project to Vercel with the Flash Install integration:

1. Vercel's build system starts the build process
2. The Flash Install plugin is loaded
3. Flash Install is installed in the build environment
4. Your project's dependencies are installed using Flash Install
5. The build continues as normal with your dependencies installed

## Performance Benefits

Flash Install provides significant performance improvements for Vercel deployments:

| Project Type | npm install | Flash Install | Improvement |
|--------------|------------|---------------|-------------|
| Next.js App | 45.2s | 22.8s | 49.6% |
| E-commerce (Next.js Commerce) | 120.5s | 58.7s | 51.3% |
| Dashboard (Next.js) | 65.8s | 35.2s | 46.5% |
| Astro Blog | 38.2s | 20.1s | 47.4% |
| SvelteKit App | 42.1s | 23.2s | 44.9% |

These improvements are even more significant for:

- Projects with many dependencies
- Monorepos
- CI/CD environments where builds happen frequently

## Troubleshooting

### Common Issues

#### Installation Fails

If the installation fails, check the following:

1. Make sure your project is compatible with the latest version of Node.js
2. Check if your package.json has any unusual dependencies
3. Verify that your lockfile is valid and up-to-date

#### Cache Not Working

If caching doesn't seem to be working:

1. Make sure `enableCache` is set to `true`
2. Check if your project has a `.npmrc` file that might be affecting caching
3. Verify that you have sufficient disk space

#### Slow Builds

If builds are still slow:

1. Increase the `concurrency` setting
2. Enable `cacheCompression` to reduce network transfer times
3. Consider using the Enterprise cloud caching feature

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/flash-install-cli/flash-install/issues) for similar problems
2. Open a new issue with detailed information about your setup
3. Contact support at support@flash-install.dev

## Advanced Usage

### Monorepo Support

Flash Install has built-in support for monorepos. For Vercel deployments with monorepos:

1. Make sure your `vercel.json` is in the root of your monorepo
2. Flash Install will automatically detect workspace packages
3. Dependencies will be installed in the correct order

For Turborepo users, Flash Install integrates seamlessly with Turborepo's caching mechanism.

### Custom Cache Location

You can specify a custom cache location by setting the `FLASH_INSTALL_CACHE_DIR` environment variable in your Vercel project settings.

### Enterprise Features

Flash Install offers additional features for enterprise users:

- **Team Cache Sharing**: Share dependency caches across your entire team
- **Cloud Cache**: Store your dependency cache in the cloud (S3, Azure, GCP)
- **Advanced Analytics**: Get detailed insights into your dependency installation performance

## FAQ

### Is Flash Install compatible with all Vercel projects?

Yes, Flash Install works with all JavaScript frameworks and build tools supported by Vercel, including Next.js, Remix, Astro, SvelteKit, and more.

### Will Flash Install affect my build output?

No, Flash Install only affects the dependency installation process. The build output will be identical to what you would get with npm, yarn, or pnpm.

### Can I use Flash Install with private npm packages?

Yes, Flash Install supports private npm packages. It uses your existing npm authentication configuration.

### Does Flash Install work with Vercel's Preview Deployments?

Yes, Flash Install works with all Vercel deployment types, including Preview Deployments.

### How does Flash Install compare to Turborepo?

Flash Install focuses on optimizing dependency installation, while Turborepo focuses on optimizing the build process. They can be used together for maximum performance.

### Is Flash Install secure?

Yes, Flash Install uses the same security model as npm. It verifies package integrity and respects npm's security features.

### Can I use Flash Install locally?

Yes, you can install Flash Install globally and use it for local development:

```bash
npm install -g @flash-install/cli
```

Then use it as a drop-in replacement for npm:

```bash
flash-install
```
