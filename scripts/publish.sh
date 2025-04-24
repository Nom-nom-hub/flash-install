#!/bin/bash
# Script to publish flash-install to npm

# Check if user is logged in to npm
if ! npm whoami &> /dev/null; then
  echo "You are not logged in to npm. Please run 'npm login' first."
  exit 1
fi

# Build the project
echo "Building the project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Please fix the errors and try again."
  exit 1
fi

# Run tests
echo "Running tests..."
npm test

# Check if tests passed
if [ $? -ne 0 ]; then
  echo "Tests failed. Please fix the errors and try again."
  exit 1
fi

# Get the current version
VERSION=$(node -p "require('./package.json').version")
echo "Current version: $VERSION"

# Ask for confirmation
read -p "Are you sure you want to publish version $VERSION to npm? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Publication aborted."
  exit 1
fi

# Publish to npm
echo "Publishing to npm..."
npm publish

# Check if publish was successful
if [ $? -eq 0 ]; then
  echo "Successfully published version $VERSION to npm!"
  echo "You can install it with: npm install -g flash-install"
else
  echo "Failed to publish to npm. Please check the error message above."
  exit 1
fi
