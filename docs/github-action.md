# Flash Install GitHub Action

Speed up your CI/CD pipeline with Flash Install, a fast npm alternative with deterministic caching.

## Features

- ⚡ **30-50% faster** than standard npm install
- 🔄 **Deterministic caching** for consistent builds
- ☁️ **Cloud caching** support for team sharing
- 🔌 **Multiple package managers** support (npm, yarn, pnpm, bun)
- 🛠️ **Optimized for CI/CD** environments

## Usage

Add Flash Install to your GitHub Actions workflow:

```yaml
steps:
  - uses: actions/checkout@v3
  
  - name: Install dependencies with Flash Install
    uses: flash-install-cli/flash-install-action@v1
    with:
      # Optional parameters (shown with defaults)
      command: 'install'           # Command to run (install, restore, snapshot, clean)
      directory: '.'               # Directory to run the command in
      cache-enabled: 'true'        # Enable GitHub Actions caching
      cloud-cache: 'false'         # Enable cloud caching
      cloud-provider: 's3'         # Cloud provider (s3, azure, gcp)
      cloud-bucket: ''             # Cloud bucket name
      cloud-region: ''             # Cloud region
      cloud-prefix: 'flash-install-cache' # Cloud prefix
      package-manager: 'npm'       # Package manager to use (npm, yarn, pnpm, bun)
      concurrency: '4'             # Number of concurrent downloads
```

## Examples

### Basic Usage

```yaml
- name: Install dependencies
  uses: flash-install-cli/flash-install-action@v1
```

### With Cloud Caching (AWS S3)

```yaml
- name: Install dependencies with S3 caching
  uses: flash-install-cli/flash-install-action@v1
  with:
    cloud-cache: 'true'
    cloud-provider: 's3'
    cloud-bucket: 'my-ci-cache-bucket'
    cloud-region: 'us-east-1'
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Using Yarn

```yaml
- name: Install dependencies with Yarn
  uses: flash-install-cli/flash-install-action@v1
  with:
    package-manager: 'yarn'
```

### Using PNPM

```yaml
- name: Install dependencies with PNPM
  uses: flash-install-cli/flash-install-action@v1
  with:
    package-manager: 'pnpm'
```

### Using Bun

```yaml
- name: Install dependencies with Bun
  uses: flash-install-cli/flash-install-action@v1
  with:
    package-manager: 'bun'
```

## Complete Workflow Example

Here's a complete workflow example using Flash Install:

```yaml
name: Build and Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
    
    - name: Install dependencies with Flash Install
      uses: flash-install-cli/flash-install-action@v1
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
```

## Benchmarks

| Project Type | npm install | flash-install | Improvement |
|--------------|------------|---------------|-------------|
| Small App    | 45s        | 28s           | 38% faster  |
| Medium App   | 1m 32s     | 52s           | 44% faster  |
| Large Monorepo | 4m 15s   | 2m 10s        | 49% faster  |

*Benchmarks run on GitHub-hosted runners with cold cache

## How It Works

Flash Install improves installation speed through:

1. **Parallel downloads** - Optimized concurrency for faster package retrieval
2. **Deterministic caching** - Intelligent caching of dependencies
3. **Cloud caching** - Optional shared cache across CI runs and team members
4. **Optimized algorithms** - Efficient dependency resolution and installation

## License

MIT
