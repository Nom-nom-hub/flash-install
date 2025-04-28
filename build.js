const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created public directory');
}

// List files in public directory
console.log('Files in public directory:');
const files = fs.readdirSync(publicDir);
files.forEach(file => {
  console.log(` - ${file}`);
});

// Create a simple index.html if it doesn't exist
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>flash-install</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #FFD700; }
  </style>
</head>
<body>
  <h1>⚡ flash-install</h1>
  <p>A fast, drop-in replacement for npm install with deterministic caching</p>
  <p><a href="https://github.com/Nom-nom-hub/flash-install">View on GitHub</a></p>
</body>
</html>`;
  
  fs.writeFileSync(indexPath, html);
  console.log('Created index.html');
}

console.log('Build completed successfully');
