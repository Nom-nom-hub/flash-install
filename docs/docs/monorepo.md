# Monorepo Support

Flash Install provides robust support for monorepos and workspaces, making it easy to manage dependencies across multiple packages in a single repository.

## Workspace Detection

Flash Install automatically detects workspaces from:

- npm workspaces in `package.json`
- Yarn workspaces in `package.json`
- pnpm workspaces in `pnpm-workspace.yaml`
- Custom configuration in `.flashrc.json`

## Using Workspace Mode

To enable workspace support, use the `-w` or `--workspace` flag:

```bash
flash-install -w
```

This will:

1. Detect all workspace packages
2. Install dependencies for the root package
3. Install dependencies for each workspace package
4. Create symlinks between workspace packages

## Workspace Options

Flash Install provides several options for customizing workspace behavior:

| Option | Description |
|--------|-------------|
| `-w, --workspace` | Enable workspace support |
| `--no-hoist` | Disable dependency hoisting |
| `--no-parallel-workspaces` | Disable parallel installation of workspace packages |
| `--workspace-concurrency <number>` | Number of concurrent workspace installations (default: 4) |
| `--workspace-filter <packages...>` | Filter specific workspace packages |

## Dependency Hoisting

By default, Flash Install hoists dependencies to the root `node_modules` directory to reduce duplication. This behavior can be disabled with the `--no-hoist` flag:

```bash
flash-install -w --no-hoist
```

## Parallel Installation

Flash Install installs workspace packages in parallel by default, respecting the dependency graph. You can disable this with the `--no-parallel-workspaces` flag:

```bash
flash-install -w --no-parallel-workspaces
```

## Filtering Workspaces

You can filter which workspace packages to install using the `--workspace-filter` option:

```bash
flash-install -w --workspace-filter package-a package-b
```

## Listing Workspaces

To list all workspace packages in a project:

```bash
flash-install workspaces
```

This command shows:
- Package name and version
- Package location
- Workspace dependencies
- Packages that depend on this package
- Installation order

## Custom Workspace Configuration

You can customize workspace behavior by creating a `.flashrc.json` file in your project root:

```json
{
  "workspaces": {
    "enabled": true,
    "packages": [
      "packages/*",
      "apps/*"
    ],
    "hoistDependencies": true,
    "parallelInstall": true,
    "maxConcurrency": 4
  }
}
```

## Best Practices

1. **Use Snapshots**: Create a snapshot after installing all workspace packages to speed up future installations:
   ```bash
   flash-install -w && flash-install snapshot
   ```

2. **Cache Management**: Clean the cache periodically to remove unused packages:
   ```bash
   flash-install clean --global --cache-max-age 30
   ```

3. **CI/CD Integration**: Use workspace mode in CI/CD pipelines to ensure consistent installations:
   ```bash
   flash-install -w --no-dev
   ```

4. **Dependency Management**: Keep dependencies consistent across workspace packages to maximize hoisting benefits.

## Troubleshooting

If you encounter issues with workspace installations:

1. Try disabling parallel installation: `--no-parallel-workspaces`
2. Check for circular dependencies between workspace packages
3. Ensure package names are correctly specified in dependencies
4. Run with debug logging: `DEBUG=flash-install:* flash-install -w`
