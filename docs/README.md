# flash-install Documentation

This directory contains the source files for the flash-install documentation website.

## Local Development

To run the documentation site locally:

1. Install Ruby and Bundler
2. Install dependencies:

```bash
cd docs
bundle install
```

3. Start the local server:

```bash
bundle exec jekyll serve
```

4. Open your browser to http://localhost:4000/flash-install/

## Deployment

The documentation site is deployed to GitHub Pages. To deploy:

1. Make your changes to the documentation
2. Commit and push to the main branch
3. GitHub Pages will automatically build and deploy the site

## Structure

- `_config.yml`: Jekyll configuration
- `index.md`: Home page
- `docs/`: Documentation pages
- `assets/`: Images, CSS, and other assets
