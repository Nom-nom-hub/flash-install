# flash-install v1.4.1

## What's New

This release adds significant enhancements to the cloud cache functionality and improves test reliability.

### Enhanced Cloud Cache Features

- **Multiple Cloud Providers**: Added support for Azure Blob Storage and Google Cloud Storage in addition to AWS S3
- **Team Permissions and Access Controls**: Added role-based access controls (read, write, admin) for team cache sharing
- **Newest Sync Policy**: Implemented a sync policy that compares timestamps and uses the newest version
- **Cache Invalidation**: Added automatic cache invalidation based on lockfile changes
- **Manual Sync Command**: Added a `cloud-sync` command for manual cache synchronization
- **Improved Documentation**: Comprehensive documentation for all cloud cache features

### Other Improvements

- **Test Framework**: Converted tests to use Jest's testing framework for better reliability
- **Fixed TypeScript Errors**: Resolved type safety issues in cloud cache implementation
- **Documentation Updates**: Added detailed documentation for monorepo support, dependency analysis, offline mode, and performance optimizations

## Installation

```bash
npm install -g @flash-install/cli@1.4.1
```

## Usage

```bash
# Basic usage
flash-install

# Cloud cache synchronization
flash-install cloud-sync --cloud-bucket=your-bucket-name

# Team sharing with access controls
flash-install --cloud-cache --team-id=your-team --team-token=your-token --team-access-level=write
```

See the [documentation](https://github.com/Nom-nom-hub/flash-install/blob/main/docs/cloud-cache.md) for more details.
