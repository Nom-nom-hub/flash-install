# flash-install Performance in Vercel Deployments

This benchmark simulates Vercel deployments with different installation methods across various project templates.

## System Information

- **OS**: macOS 14.4.1
- **CPU**: Apple M1 Pro (10 cores)
- **Memory**: 16 GB
- **Node.js**: v16.20.2

## Results

| Project | Description | Method | Install Time | Build Time | Total Time | vs npm install | vs npm ci |
|---------|-------------|--------|--------------|------------|------------|---------------|----------|
| next-app | Next.js App Router application | npm-install | 42.5s | 18.3s | 60.8s | 0.0% | -5.2% |
| next-app | Next.js App Router application | npm-ci | 38.5s | 19.2s | 57.7s | 5.2% | 0.0% |
| next-app | Next.js App Router application | flash-install | 35.2s | 18.5s | 53.7s | 11.7% | 7.0% |
| next-app | Next.js App Router application | flash-install-cached | 22.8s | 18.4s | 41.2s | 32.3% | 28.6% |
| next-commerce | Vercel Commerce template (e-commerce project) | npm-install | 115.8s | 32.5s | 148.3s | 0.0% | -4.1% |
| next-commerce | Vercel Commerce template (e-commerce project) | npm-ci | 108.2s | 34.1s | 142.3s | 4.1% | 0.0% |
| next-commerce | Vercel Commerce template (e-commerce project) | flash-install | 72.1s | 33.2s | 105.3s | 29.0% | 26.0% |
| next-commerce | Vercel Commerce template (e-commerce project) | flash-install-cached | 58.7s | 32.8s | 91.5s | 38.3% | 35.7% |
| remix-app | Remix Indie Stack template | npm-install | 68.4s | 22.1s | 90.5s | 0.0% | -3.8% |
| remix-app | Remix Indie Stack template | npm-ci | 64.2s | 23.0s | 87.2s | 3.8% | 0.0% |
| remix-app | Remix Indie Stack template | flash-install | 45.8s | 22.5s | 68.3s | 24.6% | 21.7% |
| remix-app | Remix Indie Stack template | flash-install-cached | 35.2s | 22.3s | 57.5s | 36.5% | 34.1% |
| astro-blog | Astro blog template | npm-install | 38.2s | 15.4s | 53.6s | 0.0% | -2.5% |
| astro-blog | Astro blog template | npm-ci | 36.5s | 15.8s | 52.3s | 2.5% | 0.0% |
| astro-blog | Astro blog template | flash-install | 28.7s | 15.5s | 44.2s | 17.6% | 15.5% |
| astro-blog | Astro blog template | flash-install-cached | 20.1s | 15.6s | 35.7s | 33.4% | 31.8% |
| sveltekit-app | SvelteKit application | npm-install | 42.1s | 12.8s | 54.9s | 0.0% | -3.2% |
| sveltekit-app | SvelteKit application | npm-ci | 39.8s | 13.4s | 53.2s | 3.2% | 0.0% |
| sveltekit-app | SvelteKit application | flash-install | 30.5s | 13.1s | 43.6s | 20.6% | 18.1% |
| sveltekit-app | SvelteKit application | flash-install-cached | 23.2s | 13.0s | 36.2s | 34.1% | 32.0% |

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
        "installTime": 42.5,
        "buildTime": 18.3,
        "totalTime": 60.8
      },
      {
        "method": "npm-ci",
        "description": "npm ci (clean install)",
        "installTime": 38.5,
        "buildTime": 19.2,
        "totalTime": 57.7
      },
      {
        "method": "flash-install",
        "description": "flash-install (first run)",
        "installTime": 35.2,
        "buildTime": 18.5,
        "totalTime": 53.7
      },
      {
        "method": "flash-install-cached",
        "description": "flash-install (with cache)",
        "installTime": 22.8,
        "buildTime": 18.4,
        "totalTime": 41.2
      }
    ]
  },
  {
    "project": "next-commerce",
    "description": "Vercel Commerce template (e-commerce project)",
    "metrics": [
      {
        "method": "npm-install",
        "description": "Standard npm install",
        "installTime": 115.8,
        "buildTime": 32.5,
        "totalTime": 148.3
      },
      {
        "method": "npm-ci",
        "description": "npm ci (clean install)",
        "installTime": 108.2,
        "buildTime": 34.1,
        "totalTime": 142.3
      },
      {
        "method": "flash-install",
        "description": "flash-install (first run)",
        "installTime": 72.1,
        "buildTime": 33.2,
        "totalTime": 105.3
      },
      {
        "method": "flash-install-cached",
        "description": "flash-install (with cache)",
        "installTime": 58.7,
        "buildTime": 32.8,
        "totalTime": 91.5
      }
    ]
  },
  {
    "project": "remix-app",
    "description": "Remix Indie Stack template",
    "metrics": [
      {
        "method": "npm-install",
        "description": "Standard npm install",
        "installTime": 68.4,
        "buildTime": 22.1,
        "totalTime": 90.5
      },
      {
        "method": "npm-ci",
        "description": "npm ci (clean install)",
        "installTime": 64.2,
        "buildTime": 23.0,
        "totalTime": 87.2
      },
      {
        "method": "flash-install",
        "description": "flash-install (first run)",
        "installTime": 45.8,
        "buildTime": 22.5,
        "totalTime": 68.3
      },
      {
        "method": "flash-install-cached",
        "description": "flash-install (with cache)",
        "installTime": 35.2,
        "buildTime": 22.3,
        "totalTime": 57.5
      }
    ]
  },
  {
    "project": "astro-blog",
    "description": "Astro blog template",
    "metrics": [
      {
        "method": "npm-install",
        "description": "Standard npm install",
        "installTime": 38.2,
        "buildTime": 15.4,
        "totalTime": 53.6
      },
      {
        "method": "npm-ci",
        "description": "npm ci (clean install)",
        "installTime": 36.5,
        "buildTime": 15.8,
        "totalTime": 52.3
      },
      {
        "method": "flash-install",
        "description": "flash-install (first run)",
        "installTime": 28.7,
        "buildTime": 15.5,
        "totalTime": 44.2
      },
      {
        "method": "flash-install-cached",
        "description": "flash-install (with cache)",
        "installTime": 20.1,
        "buildTime": 15.6,
        "totalTime": 35.7
      }
    ]
  },
  {
    "project": "sveltekit-app",
    "description": "SvelteKit application",
    "metrics": [
      {
        "method": "npm-install",
        "description": "Standard npm install",
        "installTime": 42.1,
        "buildTime": 12.8,
        "totalTime": 54.9
      },
      {
        "method": "npm-ci",
        "description": "npm ci (clean install)",
        "installTime": 39.8,
        "buildTime": 13.4,
        "totalTime": 53.2
      },
      {
        "method": "flash-install",
        "description": "flash-install (first run)",
        "installTime": 30.5,
        "buildTime": 13.1,
        "totalTime": 43.6
      },
      {
        "method": "flash-install-cached",
        "description": "flash-install (with cache)",
        "installTime": 23.2,
        "buildTime": 13.0,
        "totalTime": 36.2
      }
    ]
  }
]
```

## Conclusions

- flash-install with cache is on average **34.9% faster** than npm install
- flash-install with cache is on average **32.4% faster** than npm ci
- The performance improvement is most significant for projects with many dependencies
- flash-install provides consistent performance benefits across different framework types
- The cached performance of flash-install makes it ideal for CI/CD environments like Vercel
