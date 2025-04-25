---
layout: default
title: Contributing
nav_order: 7
permalink: /docs/contributing
---

# Contributing to flash-install
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Getting Started

Thank you for your interest in contributing to flash-install! This document will guide you through the process of setting up your development environment and making contributions.

### Prerequisites

- Node.js v16 or later
- npm v7 or later
- Git

### Setting Up the Development Environment

1. Fork the repository at https://github.com/Nom-nom-hub/flash-install
2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/flash-install.git
cd flash-install
```

3. Install dependencies:

```bash
npm install
```

4. Build the project:

```bash
npm run build
```

5. Link the package globally to test your changes:

```bash
npm link
```

Now you can use your development version of flash-install globally.

## Development Workflow

### Making Changes

1. Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes to the codebase
3. Build the project to make sure your changes compile:

```bash
npm run build
```

4. Test your changes:

```bash
npm test
```

5. Commit your changes:

```bash
git add .
git commit -m "feat: add your feature"
```

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

### Testing Your Changes

flash-install has a test suite that you can run with:

```bash
npm test
```

You can also test your changes manually by using the linked version of flash-install in a test project.

### Submitting a Pull Request

1. Push your changes to your fork:

```bash
git push origin feature/your-feature-name
```

2. Go to the [flash-install repository](https://github.com/Nom-nom-hub/flash-install) and create a new pull request
3. Fill out the pull request template with details about your changes
4. Wait for a maintainer to review your pull request

## Code Style

We use ESLint and Prettier to enforce a consistent code style. You can check your code style with:

```bash
npm run lint
```

And fix any issues with:

```bash
npm run lint:fix
```

## Project Structure

Here's an overview of the project structure:

- `src/`: Source code
  - `bin/`: Command-line entry points
  - `utils/`: Utility functions
  - `cache.ts`: Cache management
  - `cli.ts`: Command-line interface
  - `install.ts`: Installation logic
  - `snapshot.ts`: Snapshot creation and restoration
  - `plugin.ts`: Plugin system
- `dist/`: Compiled JavaScript code
- `scripts/`: Build and release scripts
- `test/`: Test files
- `docs/`: Documentation

## Adding a New Feature

If you want to add a new feature to flash-install, please follow these steps:

1. Open an issue to discuss the feature before implementing it
2. Once the feature is approved, implement it in a new branch
3. Add tests for your feature
4. Update the documentation to reflect your changes
5. Submit a pull request

## Reporting Bugs

If you find a bug in flash-install, please report it by opening an issue on the [GitHub issues page](https://github.com/Nom-nom-hub/flash-install/issues) with the following information:

1. Your operating system and Node.js version
2. The command you were running
3. The error message or unexpected behavior
4. Steps to reproduce the issue
5. If possible, a minimal reproduction repository

## Code of Conduct

We expect all contributors to follow our [Code of Conduct](https://github.com/Nom-nom-hub/flash-install/blob/main/CODE_OF_CONDUCT.md). Please be respectful and considerate of others when contributing to the project.
