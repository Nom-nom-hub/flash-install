#!/bin/bash
# Script to optimize dependency installation in CI/CD environments using flash-install

# Install flash-install globally if not already installed
if ! command -v flash-install &> /dev/null; then
    echo "Installing flash-install..."
    npm install -g flash-install
fi

# Check if we have a snapshot from a previous build
if [ -f ".flashpack" ]; then
    echo "Restoring dependencies from snapshot..."
    flash-install restore
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "Dependencies restored successfully!"
        exit 0
    else
        echo "Snapshot restoration failed, falling back to regular install..."
    fi
fi

# Check if we're in a CI environment
if [ -n "$CI" ]; then
    # Use parallel installation with higher concurrency in CI
    echo "Running flash-install in CI environment..."
    flash-install -c 8
else
    # Use default settings for local development
    echo "Running flash-install in development environment..."
    flash-install
fi

# Create a snapshot for future builds
echo "Creating dependency snapshot for future builds..."
flash-install snapshot

echo "Installation complete!"
