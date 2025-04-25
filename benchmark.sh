#!/bin/bash
# Benchmark script to compare npm install vs flash-install

echo "=== Flash Install Benchmark ==="
echo ""

# Clean up
echo "Cleaning up..."
rm -rf node_modules
rm -f .flashpack*

# First run with npm install
echo ""
echo "=== First Run: npm install ==="
time npm install

# Clean up
echo ""
echo "Cleaning up..."
rm -rf node_modules

# First run with flash-install
echo ""
echo "=== First Run: flash-install ==="
time flash-install

# Clean up
echo ""
echo "Cleaning up..."
rm -rf node_modules

# Second run with npm install
echo ""
echo "=== Second Run: npm install ==="
time npm install

# Clean up
echo ""
echo "Cleaning up..."
rm -rf node_modules

# Second run with flash-install
echo ""
echo "=== Second Run: flash-install ==="
time flash-install

echo ""
echo "=== Benchmark Complete ==="
