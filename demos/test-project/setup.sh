#!/bin/bash

# flash-install Vercel Integration Demo Setup Script

# ANSI color codes
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚡ flash-install Vercel Integration Demo Setup${NC}\n"

# Check if flash-install is installed
if ! command -v flash-install &> /dev/null; then
    echo -e "${CYAN}Installing flash-install...${NC}"
    npm install -g @flash-install/cli
else
    echo -e "${CYAN}flash-install is already installed.${NC}"
fi

# Clean node_modules if it exists
if [ -d "node_modules" ]; then
    echo -e "${CYAN}Cleaning existing node_modules...${NC}"
    rm -rf node_modules
fi

# Install dependencies with flash-install
echo -e "\n${YELLOW}Installing dependencies with flash-install...${NC}"
flash-install

# Simulate Vercel build
echo -e "\n${YELLOW}Simulating Vercel build...${NC}"
npm run build

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "You can now run ${CYAN}npm run dev${NC} to start the development server."
