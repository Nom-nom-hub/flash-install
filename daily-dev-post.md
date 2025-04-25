# ⚡ flash-install: The Node.js Dependency Manager That's Up To 30x Faster

Are you tired of waiting for `npm install` to finish? **flash-install** is a drop-in replacement that can speed up your Node.js dependency installation by up to 30x through smart caching and snapshot technology.

## 🚀 Key Features:

- **Blazing Fast**: Up to 30x faster than npm for repeated installs
- **Snapshot Support**: Create `.flashpack` archives for instant dependency restoration
- **Selective Cleaning**: Clean only what you need with `clean-modules` and `clean-snapshot`
- **Works Everywhere**: Compatible with npm, yarn, and pnpm projects
- **Offline Mode**: Install dependencies without internet connection

## 💻 Installation:

```bash
npm install -g @flash-install/cli
```

## 🔥 Performance Comparison:

| Scenario | npm install | flash-install | Speedup |
|----------|------------|---------------|---------|
| First install | 30-60s | 10-15s | 3-4x |
| From cache | 30-60s | 5-10s | 6-10x |
| From snapshot | 30-60s | 1-3s | 20-30x |
| CI/CD | 1-3min | 5-15s | 10-20x |

Perfect for CI/CD pipelines, monorepos, and any project where you're tired of waiting for dependencies to install!

Check it out: https://github.com/Nom-nom-hub/flash-install
