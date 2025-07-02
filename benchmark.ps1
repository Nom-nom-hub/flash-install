# PowerShell Benchmark Script for Flash Install vs npm install

Write-Host "=== Flash Install Benchmark (PowerShell) ==="

function CleanTestProject {
    param (
        [string]$ProjectPath
    )
    Write-Host "Cleaning up $ProjectPath..."
    Remove-Item -Path "$ProjectPath\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$ProjectPath\.flashpack*" -Force -ErrorAction SilentlyContinue
}

function Time-Command($label, $command) {
    Write-Host "\n=== $label ==="
    $duration = Measure-Command { Invoke-Expression $command }
    Write-Host "$label took $($duration.TotalSeconds) seconds."
}

# --- Cold Runs (First Time Installations) ---

# Define the path to the test project
$TestProjectPath = ".\test-project-benchmark"

# --- Cold Runs (First Time Installations) ---

# Cold run with npm install
CleanTestProject $TestProjectPath
Write-Host "Running preliminary npm install to ensure node_modules are present for npm's second run"
Time-Command "Cold Run: npm install (no cache)" "cd $TestProjectPath; npm install; cd .."

# Cold run with flash-install
CleanTestProject $TestProjectPath
Time-Command "Cold Run: flash-install (no cache)" "cd $TestProjectPath; node ..\dist\cli.js install --lightweight-analysis; cd .."

# Create a snapshot after the cold flash-install run
Write-Host "Creating flash-install snapshot..."
Time-Command "Create Snapshot: flash-install" "cd $TestProjectPath; node ..\dist\cli.js snapshot; cd .."

# --- Warm Runs (Subsequent Installations with Cache) ---

# Warm run with npm install (node_modules already exists from previous run)
Write-Host "Running warm npm install (node_modules should exist)"
Time-Command "Warm Run: npm install (node_modules exists)" "cd $TestProjectPath; npm install; cd .."

# Warm run with flash-install (using snapshot)
Write-Host "Running warm flash-install (using snapshot)"
Time-Command "Warm Run: flash-install (using snapshot)" "cd $TestProjectPath; node ..\dist\cli.js restore --lightweight-analysis; cd .."

# Setup: Ensure flash-install CLI itself is built and its dependencies are installed
Write-Host "Setting up flash-install CLI..."
Time-Command "Setup: npm install for flash-install CLI" "npm install"
Time-Command "Setup: npm run build for flash-install CLI" "npm run build"

Write-Host "\n=== Benchmark Complete ==="