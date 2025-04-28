# Cloud Cache for flash-install

The cloud cache feature allows you to store and retrieve package caches from cloud storage providers, enabling teams to share caches across different environments and CI/CD pipelines.

## Supported Cloud Providers

flash-install supports the following cloud providers:

- **S3**: Amazon S3 and S3-compatible storage services (like MinIO, DigitalOcean Spaces, etc.)
- **Azure**: Azure Blob Storage
- **GCP**: Google Cloud Storage

## Configuration

You can configure the cloud cache using command-line options or environment variables.

### Command-line Options

```bash
# Basic configuration
flash-install --cloud-cache --cloud-provider=s3 --cloud-bucket=your-bucket-name

# S3 configuration
flash-install --cloud-cache \
  --cloud-provider=s3 \
  --cloud-bucket=your-bucket-name \
  --cloud-region=us-east-1 \
  --cloud-sync=newest \
  --cloud-endpoint=https://custom-s3-endpoint.com

# Azure configuration
flash-install --cloud-cache \
  --cloud-provider=azure \
  --cloud-bucket=your-container-name \
  --cloud-region=eastus \
  --cloud-endpoint=https://your-account.blob.core.windows.net

# GCP configuration
flash-install --cloud-cache \
  --cloud-provider=gcp \
  --cloud-bucket=your-bucket-name \
  --cloud-region=us-central1

# Team sharing
flash-install --cloud-cache \
  --cloud-provider=s3 \
  --cloud-bucket=your-bucket-name \
  --team-id=your-team-id \
  --team-token=your-access-token \
  --team-access-level=write \
  --team-restrict

# Cache invalidation based on lockfile changes
flash-install --cloud-cache \
  --cloud-bucket=your-bucket-name \
  --invalidate-on-lockfile-change

# Manual cloud cache synchronization
flash-install cloud-sync \
  --cloud-provider=s3 \
  --cloud-bucket=your-bucket-name \
  --direction=both \
  --force
```

### Environment Variables

You can also use environment variables to configure the cloud cache:

```bash
# Basic configuration
FLASH_CLOUD_ENABLED=true
FLASH_CLOUD_PROVIDER=s3
FLASH_CLOUD_BUCKET=your-bucket-name
FLASH_CLOUD_REGION=us-east-1
FLASH_CLOUD_SYNC=newest
FLASH_CLOUD_ENDPOINT=https://custom-s3-endpoint.com
FLASH_CLOUD_PREFIX=your-prefix

# Team sharing
FLASH_CLOUD_TEAM_ID=your-team-id
FLASH_CLOUD_TEAM_TOKEN=your-access-token
FLASH_CLOUD_TEAM_ACCESS_LEVEL=write
FLASH_CLOUD_TEAM_RESTRICT=true

# Cache invalidation
FLASH_CLOUD_INVALIDATE_ON_LOCKFILE_CHANGE=true
```

## Sync Policies

The cloud cache supports different synchronization policies to control how packages are synchronized between the local and cloud caches:

- **always-upload**: Always upload packages to the cloud cache, regardless of whether they already exist in the cloud.
- **always-download**: Always download packages from the cloud cache if they exist, regardless of whether they already exist locally.
- **upload-if-missing**: Only upload packages to the cloud cache if they don't already exist in the cloud.
- **download-if-missing**: Only download packages from the cloud cache if they don't already exist locally.
- **newest**: Use the newest version of the package, whether it's in the local or cloud cache. This compares timestamps between local and cloud files and chooses the newest one.

You can set the sync policy using the `--cloud-sync` option or the `FLASH_CLOUD_SYNC` environment variable.

## Team Sharing

You can share caches across a team by specifying a team ID and configuring access controls:

```bash
flash-install --cloud-cache \
  --cloud-provider=s3 \
  --cloud-bucket=your-bucket-name \
  --team-id=your-team-id \
  --team-token=your-access-token \
  --team-access-level=write \
  --team-restrict
```

This will store and retrieve packages in a team-specific directory in the cloud cache.

### Team Access Levels

The cloud cache supports different access levels for team members:

- **read**: Can only download packages from the team cache.
- **write**: Can download and upload packages to the team cache.
- **admin**: Has full access to the team cache, including administrative operations.

### Team Access Restrictions

You can restrict access to the team cache to only team members with valid tokens by using the `--team-restrict` option. This ensures that only authorized users can access the team cache.

## Cache Invalidation

flash-install can automatically invalidate the cloud cache when your lockfile changes. This ensures that you always use the correct dependencies for your project.

```bash
flash-install --cloud-cache \
  --cloud-bucket=your-bucket-name \
  --invalidate-on-lockfile-change
```

When enabled, flash-install will:
1. Generate a hash of your lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml)
2. Compare it with the previous hash
3. Invalidate the cache if the hash has changed

This is particularly useful in CI/CD environments where you want to ensure that the cache is always up-to-date with your dependencies.

## Manual Cloud Cache Synchronization

You can manually synchronize your local cache with the cloud cache using the `cloud-sync` command:

```bash
flash-install cloud-sync \
  --cloud-provider=s3 \
  --cloud-bucket=your-bucket-name \
  --direction=both \
  --force
```

### Sync Direction

You can control the direction of synchronization using the `--direction` option:

- **both**: Synchronize in both directions (default)
- **upload**: Only upload packages from local cache to cloud cache
- **download**: Only download packages from cloud cache to local cache

### Force Synchronization

You can force synchronization even if files already exist using the `--force` option. This is useful when you want to ensure that all packages are synchronized, regardless of their current state.

## Testing Cloud Cache Configuration

You can test your cloud cache configuration using the following command:

```bash
flash-install cloud-sync \
  --cloud-provider=s3 \
  --cloud-bucket=your-bucket-name \
  --direction=both
```

This will attempt to synchronize your local cache with the cloud cache and report any errors.

## Running Cloud Cache Tests

To run the cloud cache tests, use the following command:

```bash
npm run test:cloud
```

This will run all tests related to the cloud cache functionality.

## Troubleshooting

### Cloud Provider Credentials

#### AWS S3 Credentials

If you're using AWS S3, you can provide credentials in several ways:

1. AWS credentials file: `~/.aws/credentials`
2. AWS environment variables: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
3. IAM roles for EC2 instances or ECS tasks
4. AWS SSO

#### Azure Blob Storage Credentials

If you're using Azure Blob Storage, you can provide credentials in several ways:

1. Connection string in the `AZURE_STORAGE_CONNECTION_STRING` environment variable
2. Account name and key in the `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` environment variables
3. Azure Managed Identity
4. Azure AD service principal

#### Google Cloud Storage Credentials

If you're using Google Cloud Storage, you can provide credentials in several ways:

1. Service account key file in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. Google Cloud SDK default credentials
3. Google Cloud compute instance service account

### Cloud Provider Permissions

#### S3 Bucket Permissions

Ensure that your S3 bucket has the appropriate permissions for the operations you're performing. At a minimum, you'll need:

- `s3:PutObject`
- `s3:GetObject`
- `s3:ListBucket`
- `s3:DeleteObject`
- `s3:HeadObject`

#### Azure Blob Storage Permissions

Ensure that your Azure storage account has the appropriate permissions:

- `Storage Blob Data Contributor` role for full access
- `Storage Blob Data Reader` role for read-only access

#### Google Cloud Storage Permissions

Ensure that your Google Cloud Storage bucket has the appropriate permissions:

- `storage.objects.create`
- `storage.objects.get`
- `storage.objects.list`
- `storage.objects.delete`

### Team Access Issues

If you're experiencing issues with team access, check the following:

1. Ensure that your team ID is correct
2. Verify that your team token is valid
3. Check that your access level is sufficient for the operation you're trying to perform
4. If using `--team-restrict`, ensure that you have a valid team token

### Cache Invalidation Issues

If cache invalidation based on lockfile changes is not working as expected:

1. Ensure that the `--invalidate-on-lockfile-change` option is enabled
2. Verify that your lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml) exists and is valid
3. Check that the project directory is correctly specified

### Network Issues

If you're experiencing network issues, you can try:

1. Checking your internet connection
2. Verifying that your firewall allows connections to the cloud provider endpoint
3. Using the `--cloud-endpoint` option to specify a custom endpoint
4. Running with `--verbose` to see more detailed logs

### Offline Mode

If you're working offline, you can disable the cloud cache by not including the `--cloud-cache` option.