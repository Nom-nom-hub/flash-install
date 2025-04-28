# flash-install Vercel Integration Demo

This is a demonstration project showing how flash-install can be integrated with Vercel deployments to significantly improve build times.

## Overview

This project demonstrates:

1. **Faster dependency installation** - Up to 50% faster than npm/yarn
2. **Persistent caching** - Intelligent caching between builds
3. **Cloud cache sharing** - Team-wide dependency cache
4. **Build analytics** - Detailed metrics on dependency installation
5. **Automatic fallback** - Graceful fallback to npm if any issues occur

## How It Works

The integration consists of:

1. **Vercel Build Plugin** (`flash-install-vercel-plugin.js`) - Intercepts the standard dependency installation process and replaces it with flash-install
2. **Vercel Configuration** (`vercel.json`) - Configures the build plugin and flash-install settings
3. **flash-install Configuration** (`.flash-install.json`) - Configures flash-install's behavior

## Performance Benefits

Based on our benchmarks with typical Next.js projects:

| Project Type | npm install | npm ci | flash-install | Improvement |
|--------------|------------|--------|--------------|-------------|
| Next.js (basic) | 45s | 40s | 22s | 45-50% |
| Next.js (commerce) | 120s | 105s | 58s | 45-52% |

## Deployment

To deploy this project to Vercel:

1. Push this repository to GitHub
2. Connect the repository to Vercel
3. Deploy

The flash-install Vercel plugin will automatically handle dependency installation during the build process.

## Local Development

To run this project locally:

```bash
# Install dependencies with flash-install
npx @flash-install/cli@latest

# Start the development server
npm run dev
```

## Learn More

- [flash-install GitHub Repository](https://github.com/Nom-nom-hub/flash-install)
- [Vercel Build Plugins Documentation](https://vercel.com/docs/build-output-api/v3#build-output-configuration/plugins)
- [Next.js Documentation](https://nextjs.org/docs)
