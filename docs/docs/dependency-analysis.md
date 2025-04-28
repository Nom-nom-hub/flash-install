# Dependency Analysis Tools

Flash Install includes powerful tools for analyzing and visualizing your project's dependencies.

## Analyzing Dependencies

The `analyze` command provides statistics about your project's dependencies:

```bash
flash-install analyze
```

This will show:
- Total number of dependencies
- Unique packages
- Duplicate packages
- Total size of dependencies
- Largest dependencies
- Most duplicated dependencies

### Options

```bash
# Exclude dev dependencies
flash-install analyze --no-dev

# Show only direct dependencies
flash-install analyze --direct-only

# Limit analysis depth
flash-install analyze --max-depth 3

# Hide duplicate dependencies
flash-install analyze --no-duplicates

# Hide dependency sizes
flash-install analyze --no-sizes
```

## Visualizing Dependencies

The `deps` command generates visualizations of your dependency tree:

```bash
flash-install deps
```

This will display a tree view of your dependencies in the console.

### Visualization Formats

```bash
# Generate a tree view (default)
flash-install deps --format tree

# Generate a DOT graph (for Graphviz)
flash-install deps --format dot --output deps.dot

# Generate a Markdown report
flash-install deps --format markdown --output deps.md
```

### Customizing Visualization

```bash
# Exclude dev dependencies
flash-install deps --no-dev

# Show only direct dependencies
flash-install deps --direct-only

# Limit visualization depth
flash-install deps --max-depth 3

# Hide dependency sizes
flash-install deps --no-sizes

# Hide dependency versions
flash-install deps --no-versions

# Disable colors
flash-install deps --no-colors
```

### Saving Output

```bash
# Save to a file
flash-install deps --output deps.txt

# Save DOT graph
flash-install deps --format dot --output deps.dot

# Save Markdown report
flash-install deps --format markdown --output deps.md
```

## Using DOT Graphs

If you generate a DOT graph, you can visualize it using Graphviz:

```bash
# Generate DOT graph
flash-install deps --format dot --output deps.dot

# Convert to PNG
dot -Tpng deps.dot -o deps.png

# Convert to SVG
dot -Tsvg deps.dot -o deps.svg
```

## Analyzing Workspaces

In monorepos, you can analyze dependencies for specific workspaces:

```bash
# Analyze a specific workspace
flash-install analyze packages/my-package

# Visualize a specific workspace
flash-install deps packages/my-package
```

## Best Practices

1. **Regularly analyze dependencies** to identify bloat and duplicates
2. **Generate reports before and after changes** to track dependency growth
3. **Save visualizations** for documentation and team communication
4. **Use `--max-depth`** for large projects to focus on important dependencies
5. **Check for duplicates** to identify opportunities for deduplication
