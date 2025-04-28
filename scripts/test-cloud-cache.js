#!/usr/bin/env node

/**
 * Test script for cloud cache integration
 * 
 * This script tests the cloud cache integration by uploading and downloading a test file
 * to verify that the cloud cache is working correctly.
 * 
 * Usage:
 * node scripts/test-cloud-cache.js --provider=s3 --bucket=your-bucket [--region=us-east-1] [--endpoint=https://...] [--key=access-key] [--secret=secret-key]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CloudCache, SyncPolicy } = require('../dist/cloud/cloud-cache.js');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace(/^--/, '')] = value;
  return acc;
}, {});

// Validate required arguments
if (!args.provider) {
  console.error('Error: --provider is required');
  process.exit(1);
}

if (!args.bucket) {
  console.error('Error: --bucket is required');
  process.exit(1);
}

async function runTest() {
  try {
    console.log('Testing cloud cache integration...');
    
    // Create temp directory for test files
    const tempDir = path.join(os.tmpdir(), `flash-install-cloud-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create test file
    const testFile = path.join(tempDir, 'test-file.txt');
    fs.writeFileSync(testFile, 'This is a test file for flash-install cloud cache');
    console.log(`Created test file at ${testFile}`);
    
    // Create cloud cache config
    const cloudConfig = {
      provider: {
        type: args.provider,
        bucket: args.bucket,
        region: args.region || 'us-east-1',
        endpoint: args.endpoint,
        credentials: args.key && args.secret ? {
          accessKeyId: args.key,
          secretAccessKey: args.secret,
          sessionToken: args.token
        } : undefined,
        prefix: args.prefix
      },
      syncPolicy: SyncPolicy.ALWAYS_UPLOAD,
      localCacheDir: tempDir,
      enabled: true,
      teamId: args.teamId
    };
    
    // Initialize cloud cache
    const cloudCache = new CloudCache();
    await cloudCache.init(cloudConfig);
    console.log('Cloud cache initialized');
    
    // Test upload
    console.log('Testing upload...');
    const remotePath = 'test-file.txt';
    await cloudCache.getProvider().uploadFile(testFile, remotePath);
    console.log('✓ Upload successful');
    
    // Test download
    console.log('Testing download...');
    const downloadFile = path.join(tempDir, 'downloaded-file.txt');
    await cloudCache.getProvider().downloadFile(remotePath, downloadFile);
    console.log('✓ Download successful');
    
    // Verify content
    const originalContent = fs.readFileSync(testFile, 'utf8');
    const downloadedContent = fs.readFileSync(downloadFile, 'utf8');
    
    if (originalContent === downloadedContent) {
      console.log('✓ Content verification successful');
    } else {
      console.error('✗ Content verification failed - files do not match');
      process.exit(1);
    }
    
    // Test delete
    console.log('Testing delete...');
    await cloudCache.getProvider().deleteFile(remotePath);
    console.log('✓ Delete successful');
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Cleaned up test files');
    
    console.log('\n✓ All cloud cache tests passed successfully!');
  } catch (error) {
    console.error(`\n✗ Cloud cache test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();