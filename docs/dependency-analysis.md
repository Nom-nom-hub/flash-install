# Dependency Analysis Tools in flash-install

flash-install provides powerful tools for analyzing and visualizing your project's dependencies, helping you understand and optimize your dependency graph.

## Features

- **Dependency Graph Visualization**: Generate visual representations of your dependency graph
- **Duplicate Detection**: Identify and resolve duplicate dependencies
- **Size Analysis**: Analyze the size impact of your dependencies
- **Multiple Output Formats**: Generate reports in various formats (tree, DOT, Markdown, JSON)
- **Customizable Visualization Options**: Tailor the visualization to your needs

## Commands

### Dependency Graph

Generate a dependency graph for your project:

```bash
flash-install deps
```

This will display a tree-like representation of your dependencies in the terminal.

### Dependency Analysis

Analyze your dependencies for duplicates, size issues, and other potential problems:

```bash
flash-install analyze
```

This will generate a comprehensive report about your dependencies, including:
- Total number of dependencies
- Direct vs. transitive dependencies
- Duplicate dependencies
- Size analysis
- Potential issues and recommendations

## Output Formats

You can generate dependency reports in various formats:

```bash
# Tree format (default)
flash-install deps --format tree

# DOT format for Graphviz
flash-install deps --format dot --output deps.dot

# Markdown format
flash-install deps --format markdown --output deps.md

# JSON format
flash-install deps --format json --output deps.json
```

### Visualizing DOT Output

If you generate a DOT file, you can visualize it using Graphviz:

```bash
# Generate DOT file
flash-install deps --format dot --output deps.dot

# Generate PNG image
dot -Tpng deps.dot -o deps.png

# Generate SVG image
dot -Tsvg deps.dot -o deps.svg
```

## Customization Options

### Filtering Dependencies

You can filter the dependencies included in the analysis:

```bash
# Include only production dependencies
flash-install deps --production

# Include only development dependencies
flash-install deps --dev

# Include only specific packages
flash-install deps --include package1,package2

# Exclude specific packages
flash-install deps --exclude package1,package2

# Set maximum depth for the dependency tree
flash-install deps --depth 3
```

### Visualization Options

You can customize the visualization:

```bash
# Show dependency versions
flash-install deps --show-versions

# Show dependency sizes
flash-install deps --show-sizes

# Show license information
flash-install deps --show-licenses

# Highlight duplicates
flash-install deps --highlight-duplicates

# Highlight outdated dependencies
flash-install deps --highlight-outdated
```

## Size Analysis

Analyze the size impact of your dependencies:

```bash
flash-install analyze --size
```

This will show:
- Total size of node_modules
- Size of each dependency
- Size of each dependency's dependencies
- Percentage of total size
- Recommendations for reducing size

## Duplicate Detection

Identify and resolve duplicate dependencies:

```bash
flash-install analyze --duplicates
```

This will show:
- Duplicate dependencies in your project
- Different versions of the same package
- Dependency paths leading to duplicates
- Recommendations for resolving duplicates

## Workspace Support

In monorepos, you can analyze dependencies across workspace packages:

```bash
# Analyze all workspace packages
flash-install analyze -w

# Analyze specific workspace packages
flash-install analyze -w --workspace-filter package1,package2

# Generate a dependency graph for workspace packages
flash-install deps -w
```

## Integration with Other Tools

### CI/CD Integration

You can integrate dependency analysis into your CI/CD pipeline:

```bash
# Generate a JSON report for CI/CD
flash-install analyze --format json --output deps.json --ci

# Fail CI if there are critical issues
flash-install analyze --fail-on-issues
```

### GitHub Actions Example

```yaml
name: Dependency Analysis

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install -g flash-install
      - run: flash-install analyze --format json --output deps.json
      - uses: actions/upload-artifact@v2
        with:
          name: dependency-analysis
          path: deps.json
```

## Configuration

You can configure dependency analysis in your package.json:

```json
{
  "flash-install": {
    "analysis": {
      "format": "markdown",
      "output": "deps.md",
      "showVersions": true,
      "showSizes": true,
      "highlightDuplicates": true,
      "exclude": ["package1", "package2"],
      "maxDepth": 3
    }
  }
}
```

## Troubleshooting

### Large Dependency Graphs

If your dependency graph is very large:

1. Use the `--depth` option to limit the depth of the dependency tree
2. Use the `--exclude` option to exclude large or complex dependencies
3. Use the `--format json` option and process the output with external tools

### Performance Issues

If analysis is slow:

1. Use the `--production` flag to analyze only production dependencies
2. Exclude large dependencies with `--exclude`
3. Limit the depth with `--depth`

### Visualization Issues

If the visualization is hard to read:

1. Try different output formats (`--format dot` or `--format markdown`)
2. Reduce the complexity with filtering options
3. Use external tools like Graphviz for better visualization
