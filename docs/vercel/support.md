---
layout: vercel
title: Flash Install Vercel Integration Support
description: Get help with the Flash Install Vercel integration
permalink: /vercel/support/
---

<p align="center">
  <img src="https://raw.githubusercontent.com/flash-install-cli/flash-install/main/assets/logo.png" alt="Flash Install Logo" width="150" height="150">
</p>

<h1 align="center">Flash Install Vercel Integration Support</h1>

<p align="center">
  <a href="./">Back to Overview</a> |
  <a href="./guide">Integration Guide</a>
</p>

## Getting Help

If you're experiencing issues with the Flash Install Vercel integration, we're here to help!

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

### Support Channels

#### GitHub Issues

The fastest way to get help is to [open an issue](https://github.com/flash-install-cli/flash-install/issues/new?template=vercel-integration.md) on our GitHub repository.

Please use the Vercel Integration issue template and provide as much information as possible, including:

- Vercel Project ID
- Framework (Next.js, Remix, etc.)
- Node.js version
- Package manager (npm, yarn, pnpm)
- Flash Install version
- Build logs showing the issue

#### Email Support

For private or sensitive issues, you can email us at support@flash-install.dev.

Please include "Vercel Integration" in the subject line and provide as much information as possible about your issue.

#### Community Support

Join our [GitHub Discussions](https://github.com/flash-install-cli/flash-install/discussions) to connect with other users and get help from the community.

### Feature Requests

Have an idea for improving the Flash Install Vercel integration? We'd love to hear it!

Please [open an issue](https://github.com/flash-install-cli/flash-install/issues/new?labels=enhancement) with the "enhancement" label and describe your feature request in detail.

### Reporting Security Issues

If you discover a security vulnerability, please email security@flash-install.dev instead of using the public issue tracker.

We will respond as quickly as possible to address the issue.
