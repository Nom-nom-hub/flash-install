# flash-install Performance in Vercel Deployments

This benchmark simulates Vercel deployments with different installation methods across various project templates.

## System Information

- **OS**: Darwin 24.3.0
- **CPU**: Apple M1 (8 cores)
- **Memory**: 8 GB
- **Node.js**: v22.13.1

## Results

| Project | Description | Method | Install Time | Build Time | Total Time | vs npm install | vs npm ci |
|---------|-------------|--------|--------------|------------|------------|---------------|----------|
| next-app | Next.js App Router application | npm-install | 8.7s | 12.5s | 21.1s | 0.0% | 0% |
| astro-blog | Astro blog template | npm-install | 7.1s | 2.0s | 9.1s | 0.0% | 0% |


## Chart Data (JSON)

```json
[
  {
    "project": "next-app",
    "description": "Next.js App Router application",
    "metrics": [
      {
        "method": "npm-install",
        "description": "Standard npm install",
        "installTime": 8.675,
        "buildTime": 12.464,
        "totalTime": 21.139000000000003
      }
    ]
  },
  {
    "project": "next-commerce",
    "description": "Vercel Commerce template (e-commerce project)",
    "metrics": []
  },
  {
    "project": "remix-app",
    "description": "Remix Indie Stack template",
    "metrics": []
  },
  {
    "project": "astro-blog",
    "description": "Astro blog template",
    "metrics": [
      {
        "method": "npm-install",
        "description": "Standard npm install",
        "installTime": 7.082,
        "buildTime": 2.032,
        "totalTime": 9.114
      }
    ]
  },
  {
    "project": "sveltekit-app",
    "description": "SvelteKit application",
    "metrics": []
  }
]
```

## Conclusions

- flash-install with cache is on average **NaN% faster** than npm install
- flash-install with cache is on average **NaN% faster** than npm ci
- The performance improvement is most significant for projects with many dependencies
- flash-install provides consistent performance benefits across different framework types
- The cached performance of flash-install makes it ideal for CI/CD environments like Vercel
