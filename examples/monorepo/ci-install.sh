#!/bin/bash
# Script to optimize dependency installation in CI/CD environments using flash-install with workspace support

# Install flash-install globally if not already installed
if ! command -v flash-install &> /dev/null; then
    echo "Installing flash-install..."
    npm install -g @flash-install/cli
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

# Install dependencies with workspace support
echo "Installing dependencies with workspace support..."
flash-install -w --no-dev

# Create a snapshot for future builds
echo "Creating snapshot for future builds..."
flash-install snapshot

echo "Installation completed successfully!"
