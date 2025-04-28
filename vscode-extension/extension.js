const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Flash Install extension is now active');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('flash-install.install', () => runFlashInstall('install')),
        vscode.commands.registerCommand('flash-install.restore', () => runFlashInstall('restore')),
        vscode.commands.registerCommand('flash-install.snapshot', () => runFlashInstall('snapshot')),
        vscode.commands.registerCommand('flash-install.clean', () => runFlashInstall('clean')),
        vscode.commands.registerCommand('flash-install.visualize', visualizeDependencies)
    );
}

/**
 * Run flash-install command
 * @param {string} command Command to run
 */
async function runFlashInstall(command) {
    // Get workspace folder
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    // Check if flash-install is installed
    try {
        await checkFlashInstall();
    } catch (error) {
        const install = await vscode.window.showErrorMessage(
            'flash-install is not installed. Would you like to install it?',
            'Install',
            'Cancel'
        );
        
        if (install === 'Install') {
            await installFlashInstall();
        } else {
            return;
        }
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('flash-install');
    const packageManager = config.get('packageManager');
    const cloudCache = config.get('cloudCache');
    const cloudProvider = config.get('cloudProvider');
    const cloudBucket = config.get('cloudBucket');
    const cloudRegion = config.get('cloudRegion');

    // Build command
    let cmd = `flash-install ${command} --package-manager ${packageManager}`;
    
    if (cloudCache && cloudBucket) {
        cmd += ` --cloud-cache --cloud-provider ${cloudProvider} --cloud-bucket ${cloudBucket}`;
        
        if (cloudRegion) {
            cmd += ` --cloud-region ${cloudRegion}`;
        }
    }

    // Create terminal
    const terminal = vscode.window.createTerminal('Flash Install');
    terminal.sendText(`cd "${workspaceFolder}"`);
    terminal.sendText(cmd);
    terminal.show();
}

/**
 * Visualize dependencies
 */
async function visualizeDependencies() {
    // Get workspace folder
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    // Check if package.json exists
    const packageJsonPath = path.join(workspaceFolder, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        vscode.window.showErrorMessage('No package.json found in workspace folder');
        return;
    }

    // Check if flash-install is installed
    try {
        await checkFlashInstall();
    } catch (error) {
        const install = await vscode.window.showErrorMessage(
            'flash-install is not installed. Would you like to install it?',
            'Install',
            'Cancel'
        );
        
        if (install === 'Install') {
            await installFlashInstall();
        } else {
            return;
        }
    }

    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
        'flashInstallDependencies',
        'Dependency Visualization',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    // Set initial HTML
    panel.webview.html = getVisualizationHtml('Loading dependencies...');

    // Run flash-install analyze command
    exec(`flash-install analyze --json`, { cwd: workspaceFolder }, (error, stdout, stderr) => {
        if (error) {
            panel.webview.html = getVisualizationHtml(`Error: ${error.message}`);
            return;
        }

        try {
            const data = JSON.parse(stdout);
            panel.webview.html = getVisualizationHtml('', data);
        } catch (e) {
            panel.webview.html = getVisualizationHtml(`Error parsing dependency data: ${e.message}`);
        }
    });
}

/**
 * Get workspace folder
 * @returns {string|null} Workspace folder path
 */
function getWorkspaceFolder() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }
    
    return workspaceFolders[0].uri.fsPath;
}

/**
 * Check if flash-install is installed
 * @returns {Promise<boolean>} True if installed
 */
function checkFlashInstall() {
    return new Promise((resolve, reject) => {
        exec('flash-install --version', (error) => {
            if (error) {
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Install flash-install
 * @returns {Promise<void>}
 */
function installFlashInstall() {
    return new Promise((resolve, reject) => {
        const terminal = vscode.window.createTerminal('Install Flash Install');
        terminal.sendText('npm install -g @flash-install/cli');
        terminal.show();
        
        vscode.window.showInformationMessage(
            'Installing flash-install globally. Please run the command again after installation completes.'
        );
        
        resolve();
    });
}

/**
 * Get visualization HTML
 * @param {string} message Message to display
 * @param {object} data Dependency data
 * @returns {string} HTML
 */
function getVisualizationHtml(message, data = null) {
    if (data) {
        // Create dependency visualization
        const dependencyCount = Object.keys(data.dependencies).length;
        const directDependencies = data.directDependencies || 0;
        const devDependencies = data.devDependencies || 0;
        
        let dependencyHtml = '';
        
        // Create dependency tree
        dependencyHtml += '<div class="dependency-tree">';
        dependencyHtml += '<h3>Dependency Tree</h3>';
        dependencyHtml += '<ul class="tree">';
        
        // Add top-level dependencies
        for (const [name, info] of Object.entries(data.dependencies)) {
            if (info.isDirect) {
                dependencyHtml += `<li>
                    <span class="package ${info.isDevDependency ? 'dev' : 'prod'}">${name}@${info.version}</span>
                    ${renderDependencyChildren(name, info, data.dependencies)}
                </li>`;
            }
        }
        
        dependencyHtml += '</ul>';
        dependencyHtml += '</div>';
        
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dependency Visualization</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        padding: 20px;
                        color: var(--vscode-foreground);
                    }
                    .stats {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                    }
                    .stat-box {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        padding: 15px;
                        flex: 1;
                        margin: 0 10px;
                        text-align: center;
                    }
                    .stat-box:first-child {
                        margin-left: 0;
                    }
                    .stat-box:last-child {
                        margin-right: 0;
                    }
                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    .stat-label {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .dependency-tree {
                        margin-top: 30px;
                    }
                    .tree {
                        list-style-type: none;
                        padding-left: 20px;
                    }
                    .tree ul {
                        list-style-type: none;
                        padding-left: 20px;
                    }
                    .package {
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-family: monospace;
                    }
                    .prod {
                        background-color: var(--vscode-terminal-ansiGreen);
                        color: var(--vscode-terminal-foreground);
                    }
                    .dev {
                        background-color: var(--vscode-terminal-ansiYellow);
                        color: var(--vscode-terminal-foreground);
                    }
                    .toggle {
                        cursor: pointer;
                        user-select: none;
                    }
                    .toggle::before {
                        content: "▶";
                        display: inline-block;
                        margin-right: 5px;
                        transition: transform 0.2s;
                    }
                    .toggle.open::before {
                        transform: rotate(90deg);
                    }
                    .children {
                        display: none;
                    }
                    .children.open {
                        display: block;
                    }
                </style>
            </head>
            <body>
                <h2>Dependency Visualization</h2>
                
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value">${dependencyCount}</div>
                        <div class="stat-label">Total Dependencies</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${directDependencies}</div>
                        <div class="stat-label">Direct Dependencies</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${devDependencies}</div>
                        <div class="stat-label">Dev Dependencies</div>
                    </div>
                </div>
                
                ${dependencyHtml}
                
                <script>
                    // Add toggle functionality
                    document.querySelectorAll('.toggle').forEach(toggle => {
                        toggle.addEventListener('click', () => {
                            toggle.classList.toggle('open');
                            toggle.nextElementSibling.classList.toggle('open');
                        });
                    });
                </script>
            </body>
            </html>
        `;
    } else {
        // Show loading or error message
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dependency Visualization</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        padding: 20px;
                        color: var(--vscode-foreground);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                    }
                    .message {
                        font-size: 16px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="message">${message}</div>
            </body>
            </html>
        `;
    }
}

/**
 * Render dependency children
 * @param {string} name Package name
 * @param {object} info Package info
 * @param {object} dependencies All dependencies
 * @returns {string} HTML
 */
function renderDependencyChildren(name, info, dependencies) {
    if (!info.dependencies || Object.keys(info.dependencies).length === 0) {
        return '';
    }
    
    let html = '<span class="toggle"></span><ul class="children">';
    
    for (const [childName, childVersion] of Object.entries(info.dependencies)) {
        const childInfo = dependencies[childName];
        if (childInfo) {
            html += `<li>
                <span class="package">${childName}@${childInfo.version}</span>
                ${renderDependencyChildren(childName, childInfo, dependencies)}
            </li>`;
        } else {
            html += `<li><span class="package">${childName}@${childVersion}</span></li>`;
        }
    }
    
    html += '</ul>';
    return html;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
