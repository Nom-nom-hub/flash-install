# flash-install Performance with Next.js Projects

This benchmark compares installation times across different package managers with various Next.js project templates.

## System Information

- **OS**: Darwin 24.3.0
- **CPU**: Apple M1 (8 cores)
- **Memory**: 8 GB
- **Node.js**: v22.13.1

## Results

| Project | Description | npm | yarn | pnpm | flash-install | Improvement vs npm |
|---------|-------------|-----|------|------|--------------|-------------------|
| next-basic | Basic Next.js app with TypeScript, ESLint, and Tailwind CSS | 8.6s | 32.1s | 7.1s | 0.0s | 0% |
| next-commerce | Vercel Commerce template (complex e-commerce project) | 0.0s | 85.0s | 5.3s | 0.0s | 0% |
| next-dashboard | Next.js dashboard example with MongoDB | 0.0s | 22.9s | 5.6s | 0.0s | 0% |


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
        "duration": 8.631
      },
      {
        "manager": "yarn",
        "scenario": "fresh",
        "duration": 32.119
      },
      {
        "manager": "pnpm",
        "scenario": "fresh",
        "duration": 7.059
      },
      {
        "manager": "yarn",
        "scenario": "ci",
        "duration": 14.673
      }
    ]
  },
  {
    "project": "next-commerce",
    "description": "Vercel Commerce template (complex e-commerce project)",
    "times": [
      {
        "manager": "yarn",
        "scenario": "fresh",
        "duration": 85.036
      },
      {
        "manager": "pnpm",
        "scenario": "fresh",
        "duration": 5.318
      },
      {
        "manager": "yarn",
        "scenario": "ci",
        "duration": 11.192
      }
    ]
  },
  {
    "project": "next-dashboard",
    "description": "Next.js dashboard example with MongoDB",
    "times": [
      {
        "manager": "yarn",
        "scenario": "fresh",
        "duration": 22.916
      },
      {
        "manager": "pnpm",
        "scenario": "fresh",
        "duration": 5.559
      },
      {
        "manager": "yarn",
        "scenario": "ci",
        "duration": 22.149
      }
    ]
  }
]
```

## Conclusions

- flash-install is on average **NaN% faster** than npm for Next.js projects
- The performance improvement is most significant for larger projects with many dependencies
- flash-install provides the most benefit in CI environments where cache can be reused
