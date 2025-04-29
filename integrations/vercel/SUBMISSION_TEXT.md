# Flash Install Vercel Marketplace Submission

This document contains all the text and information needed for submitting Flash Install to the Vercel Marketplace.

## Basic Information

### Name
Flash Install

### Slug
flash-install

### Short Description (50 characters max)
Accelerate Vercel builds by up to 50%

### Long Description (500 characters max)
Flash Install dramatically speeds up dependency installation through deterministic caching and parallel operations. Reduce Vercel build times by 30-50%, with even greater improvements for large projects and monorepos. Works with all JavaScript frameworks including Next.js, Remix, Astro, and SvelteKit. Zero configuration required with automatic fallback to npm if any issues occur.

### Category
Developer Tools

### Tags
- dependencies
- performance
- build-tools
- caching
- npm
- yarn
- pnpm

## Integration Details

### Value Proposition (200 characters max)
Flash Install reduces Vercel build times by up to 50% through optimized dependency installation, saving compute minutes and improving developer experience.

### Use Cases (500 characters max)
1. **Faster Deployments**: Reduce build times for all your Vercel projects
2. **Monorepo Optimization**: Significantly improve build performance for monorepos
3. **CI/CD Efficiency**: Reduce compute minutes and costs in CI/CD environments
4. **Team Productivity**: Improve developer experience with faster feedback cycles
5. **Enterprise Collaboration**: Share dependency caches across your entire team (Enterprise feature)

### Features (bullet points)
- Reduce dependency installation time by up to 50%
- Smart caching ensures consistent, reliable builds
- Works with all JavaScript frameworks (Next.js, Remix, Astro, SvelteKit)
- Zero configuration required with sensible defaults
- Automatic fallback to npm if any issues occur
- Team-wide cache sharing (Enterprise feature)

### How It Works (200 characters max)
Flash Install analyzes your package.json and lockfile, uses smart caching based on content hashes, and installs dependencies in parallel for maximum speed.

## Configuration Options

### enableCache
- **Type**: Boolean
- **Default**: true
- **Description**: Enable Flash Install's deterministic caching

### cacheCompression
- **Type**: Boolean
- **Default**: true
- **Description**: Enable compression for cached packages

### concurrency
- **Type**: Number
- **Default**: 4
- **Description**: Number of concurrent package installations (1-16)

### fallbackToNpm
- **Type**: Boolean
- **Default**: true
- **Description**: Fall back to npm if Flash Install encounters an error

## URLs and Resources

### Homepage URL
https://github.com/flash-install-cli/flash-install

### Documentation URL
https://flash-install-cli.github.io/flash-install/vercel/

### Support URL
https://github.com/flash-install-cli/flash-install/issues

### GitHub Repository
https://github.com/flash-install-cli/flash-install

### NPM Package
https://www.npmjs.com/package/@flash-install/cli

## Pricing Plans

### Free Tier
- **Name**: Free
- **Price**: $0/month
- **Description**: Basic dependency acceleration for all projects
- **Features**:
  - Up to 50% faster dependency installation
  - Works with all JavaScript frameworks
  - Automatic fallback to npm

### Pro Tier (Optional)
- **Name**: Pro
- **Price**: $10/month
- **Description**: Enhanced caching and metrics for professional teams
- **Features**:
  - All Free tier features
  - Enhanced cloud caching
  - Performance metrics dashboard
  - Priority support

### Enterprise Tier (Optional)
- **Name**: Enterprise
- **Price**: Custom
- **Description**: Team-wide cache sharing and advanced features
- **Features**:
  - All Pro tier features
  - Team-wide cache sharing
  - Custom cache location
  - Dedicated support

## Required Scopes

- `builds:read` - To access build information
- `builds:write` - To modify build processes
- `team:read` - To access team information for cache sharing (Enterprise feature)

## Additional Information

### Installation Instructions
After adding the integration from the Vercel Marketplace:
1. Select the projects you want to enable Flash Install for
2. Configure the integration settings (or use the defaults)
3. Deploy your projects to see the performance improvements

### Compatibility
Flash Install is compatible with all JavaScript frameworks and build tools supported by Vercel, including Next.js, Remix, Astro, SvelteKit, and more.

### Support Contact
support@flash-install.dev
