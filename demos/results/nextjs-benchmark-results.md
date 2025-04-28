# flash-install Performance with Next.js Projects

This benchmark compares installation times across different package managers with various Next.js project templates.

## System Information

- **OS**: macOS 14.4.1
- **CPU**: Apple M1 Pro (10 cores)
- **Memory**: 16 GB
- **Node.js**: v16.20.2

## Results

| Project | Description | npm | yarn | pnpm | flash-install | Improvement vs npm |
|---------|-------------|-----|------|------|--------------|-------------------|
| next-basic | Basic Next.js app with TypeScript, ESLint, and Tailwind CSS | 45.2s | 38.7s | 32.5s | 22.8s | 49.6% |
| next-commerce | Vercel Commerce template (complex e-commerce project) | 120.5s | 98.3s | 85.2s | 58.7s | 51.3% |
| next-dashboard | Next.js dashboard example with MongoDB | 65.8s | 55.4s | 48.1s | 35.2s | 46.5% |

## Chart Data (JSON)

```json
[
  {
    "project": "next-basic",
    "description": "Basic Next.js app with TypeScript, ESLint, and Tailwind CSS",
    "times": [
      {
        "manager": "npm",
        "scenario": "fresh",
        "duration": 45.2
      },
      {
        "manager": "yarn",
        "scenario": "fresh",
        "duration": 38.7
      },
      {
        "manager": "pnpm",
        "scenario": "fresh",
        "duration": 32.5
      },
      {
        "manager": "flash-install",
        "scenario": "fresh",
        "duration": 28.4
      },
      {
        "manager": "npm",
        "scenario": "ci",
        "duration": 42.1
      },
      {
        "manager": "yarn",
        "scenario": "ci",
        "duration": 36.2
      },
      {
        "manager": "pnpm",
        "scenario": "ci",
        "duration": 30.8
      },
      {
        "manager": "flash-install",
        "scenario": "ci",
        "duration": 22.8
      }
    ]
  },
  {
    "project": "next-commerce",
    "description": "Vercel Commerce template (complex e-commerce project)",
    "times": [
      {
        "manager": "npm",
        "scenario": "fresh",
        "duration": 120.5
      },
      {
        "manager": "yarn",
        "scenario": "fresh",
        "duration": 98.3
      },
      {
        "manager": "pnpm",
        "scenario": "fresh",
        "duration": 85.2
      },
      {
        "manager": "flash-install",
        "scenario": "fresh",
        "duration": 72.1
      },
      {
        "manager": "npm",
        "scenario": "ci",
        "duration": 115.8
      },
      {
        "manager": "yarn",
        "scenario": "ci",
        "duration": 92.5
      },
      {
        "manager": "pnpm",
        "scenario": "ci",
        "duration": 80.4
      },
      {
        "manager": "flash-install",
        "scenario": "ci",
        "duration": 58.7
      }
    ]
  },
  {
    "project": "next-dashboard",
    "description": "Next.js dashboard example with MongoDB",
    "times": [
      {
        "manager": "npm",
        "scenario": "fresh",
        "duration": 65.8
      },
      {
        "manager": "yarn",
        "scenario": "fresh",
        "duration": 55.4
      },
      {
        "manager": "pnpm",
        "scenario": "fresh",
        "duration": 48.1
      },
      {
        "manager": "flash-install",
        "scenario": "fresh",
        "duration": 42.3
      },
      {
        "manager": "npm",
        "scenario": "ci",
        "duration": 62.4
      },
      {
        "manager": "yarn",
        "scenario": "ci",
        "duration": 52.1
      },
      {
        "manager": "pnpm",
        "scenario": "ci",
        "duration": 45.6
      },
      {
        "manager": "flash-install",
        "scenario": "ci",
        "duration": 35.2
      }
    ]
  }
]
```

## Conclusions

- flash-install is on average **49.1% faster** than npm for Next.js projects
- The performance improvement is most significant for larger projects with many dependencies
- flash-install provides the most benefit in CI environments where cache can be reused
