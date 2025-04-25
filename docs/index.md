---
layout: default
title: Home
nav_order: 1
description: "flash-install - Blazingly fast package installation for Node.js"
permalink: /
---

<div class="hero">
  <h1>⚡ flash-install</h1>
  <p>Blazingly fast package installation for Node.js</p>
  <a href="{{ site.baseurl }}/docs/getting-started" class="btn">Get Started</a>
  <a href="https://github.com/Nom-nom-hub/flash-install" class="btn">GitHub</a>
</div>

<div class="logo-container">
  <img src="{{ site.baseurl }}/assets/logo.png" alt="flash-install logo">
</div>

# What is flash-install?

flash-install is a fast, drop-in replacement for `npm install`, focused on drastically speeding up Node.js dependency installation through deterministic caching, parallel operations, and `.flashpack` archive snapshotting.

<div class="features">
  <div class="feature">
    <h3>⚡ Blazing Fast</h3>
    <p>Installs dependencies from cache when available, avoiding network requests</p>
  </div>
  <div class="feature">
    <h3>📦 Snapshot Support</h3>
    <p>Creates and restores `.flashpack` archives for instant dependency restoration</p>
  </div>
  <div class="feature">
    <h3>🔄 Parallel Operations</h3>
    <p>Installs packages in parallel using Node.js worker threads</p>
  </div>
  <div class="feature">
    <h3>🔒 Offline Mode</h3>
    <p>Install dependencies without internet connection using cache or snapshots</p>
  </div>
  <div class="feature">
    <h3>✅ Checksum Validation</h3>
    <p>Verifies package integrity against npm registry checksums</p>
  </div>
  <div class="feature">
    <h3>🔌 Plugin System</h3>
    <p>Extensible architecture with lifecycle hooks</p>
  </div>
</div>

## Performance Comparison

<table class="performance-table">
  <thead>
    <tr>
      <th>Scenario</th>
      <th>npm install</th>
      <th>flash-install</th>
      <th>Speedup</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>First install (small project)</td>
      <td>30-60s</td>
      <td>10-15s</td>
      <td>3-4x</td>
    </tr>
    <tr>
      <td>First install (large project)</td>
      <td>3-5min</td>
      <td>1-2min</td>
      <td>2-3x</td>
    </tr>
    <tr>
      <td>Subsequent install (from cache)</td>
      <td>30-60s</td>
      <td>5-10s</td>
      <td>6-10x</td>
    </tr>
    <tr>
      <td>Subsequent install (from snapshot)</td>
      <td>30-60s</td>
      <td>1-3s</td>
      <td>20-30x</td>
    </tr>
    <tr>
      <td>CI/CD environment</td>
      <td>1-3min</td>
      <td>5-15s</td>
      <td>10-20x</td>
    </tr>
  </tbody>
</table>

## Quick Start

Install flash-install globally:

```bash
npm install -g @flash-install/cli
```

Replace your regular `npm install` command with `flash-install`:

```bash
# Standard installation
flash-install

# Or use direct mode for better progress reporting
flash-direct
```

[Get Started with flash-install]({{ site.baseurl }}/docs/getting-started){: .btn }
