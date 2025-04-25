---
layout: default
title: Performance Tips
nav_order: 5
permalink: /docs/performance-tips
---

# Performance Tips
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Maximizing Installation Speed

### Use Snapshots for Repeated Installations

The fastest way to install dependencies is to restore them from a snapshot:

```bash
# Create a snapshot after installing dependencies
flash-install && flash-install snapshot

# Later, restore from the snapshot
flash-install restore
```

This is especially useful in CI/CD environments where you want to avoid reinstalling dependencies for each build.

### Optimize Cache Usage

The global cache is used to speed up installations across different projects. To get the most out of it:

1. Run `flash-install cache --optimize` periodically to optimize the cache storage
2. Use `flash-install cache --verify` to check the integrity of the cache
3. Consider increasing the cache size if you work with many large projects

### Adjust Concurrency

By default, flash-install uses a reasonable number of concurrent operations based on your system's capabilities. You can adjust this:

```bash
# Increase concurrency for faster installations on powerful machines
flash-install --concurrency 16

# Decrease concurrency for more stable installations on less powerful machines
flash-install --concurrency 4
```

### Skip Dev Dependencies in Production

For production builds, you can skip dev dependencies to speed up the installation:

```bash
flash-install --no-dev
```

### Skip Postinstall Scripts

Postinstall scripts can be time-consuming. If you don't need them, you can skip them:

```bash
flash-install --skip-postinstall
```

## CI/CD Optimization

### Caching Snapshots in CI/CD

Most CI/CD systems support caching. You can cache the `.flashpack` snapshot to speed up builds:

#### GitHub Actions Example

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Cache dependencies
      uses: actions/cache@v2
      with:
        path: .flashpack
        key: ${{ runner.os }}-flashpack-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-flashpack-
    
    - name: Install flash-install
      run: npm install -g @flash-install/cli
    
    - name: Install dependencies
      run: |
        if [ -f .flashpack ]; then
          flash-install restore
        else
          flash-install
          flash-install snapshot
        fi
    
    - name: Build
      run: npm run build
    
    - name: Test
      run: npm test
```

#### CircleCI Example

```yaml
version: 2.1

jobs:
  build:
    docker:
      - image: cimg/node:16.13
    
    steps:
      - checkout
      
      - restore_cache:
          keys:
            - flashpack-{{ checksum "package-lock.json" }}
            - flashpack-
      
      - run:
          name: Install flash-install
          command: npm install -g @flash-install/cli
      
      - run:
          name: Install dependencies
          command: |
            if [ -f .flashpack ]; then
              flash-install restore
            else
              flash-install
              flash-install snapshot
            fi
      
      - save_cache:
          paths:
            - .flashpack
          key: flashpack-{{ checksum "package-lock.json" }}
      
      - run:
          name: Build
          command: npm run build
      
      - run:
          name: Test
          command: npm test
```

### Using Environment Variables in CI/CD

You can use environment variables to configure flash-install in CI/CD:

```bash
FLASH_INSTALL_CONCURRENCY=16 FLASH_INSTALL_NO_DEV=true flash-install
```

## Monorepo Optimization

In monorepos, you can use flash-install to speed up installations:

1. Create a snapshot of the root node_modules:

```bash
cd monorepo-root
flash-install && flash-install snapshot
```

2. Use the snapshot in CI/CD:

```bash
cd monorepo-root
flash-install restore
```

3. For individual packages, you can use the global cache:

```bash
cd monorepo-root/packages/package-a
flash-install
```

## Benchmarking

To benchmark flash-install against npm, you can use the following script:

```bash
#!/bin/bash

echo "Benchmarking npm install..."
rm -rf node_modules
time npm install

echo "Benchmarking flash-install..."
rm -rf node_modules
time flash-install

echo "Benchmarking flash-install restore..."
rm -rf node_modules
time flash-install restore
```

This will give you a comparison of the installation times for your specific project.
