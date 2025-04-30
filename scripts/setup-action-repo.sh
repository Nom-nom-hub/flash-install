#!/bin/bash

# This script helps set up a new repository for the Flash Install GitHub Action

# Create a new directory for the action repository
mkdir -p ~/flash-install-github-action

# Copy the action files to the new directory
cp -r .github/actions/flash-install-action/* ~/flash-install-github-action/

# Create a new action.yml file in the root of the repository
cp .github/actions/flash-install-action/action.yml ~/flash-install-github-action/

# Create a new README.md file in the root of the repository
cp .github/actions/flash-install-action/README.md ~/flash-install-github-action/

# Create a new LICENSE file
cat > ~/flash-install-github-action/LICENSE << 'EOF'
MIT License

Copyright (c) 2023 Flash Install

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Create a .gitignore file
cat > ~/flash-install-github-action/.gitignore << 'EOF'
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# dotenv environment variable files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Mac files
.DS_Store

# Yarn
yarn-error.log
.pnp/
.pnp.js

# Yarn Integrity file
.yarn-integrity
EOF

echo "Action repository set up at ~/flash-install-github-action"
echo "Next steps:"
echo "1. Create a new repository on GitHub named 'flash-install-action'"
echo "2. Initialize the repository and push the code:"
echo "   cd ~/flash-install-github-action"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/flash-install-cli/flash-install-action.git"
echo "   git push -u origin main"
echo "3. Create a release with a semantic version tag (e.g., v1.0.0)"
echo "4. Publish the action to the GitHub Marketplace"
