/**
 * Vercel integration endpoint
 */

export default function handler(req, res) {
  // This endpoint would typically handle Vercel integration requests
  // For now, we'll just return a success message
  return res.status(200).json({
    name: 'Flash Install',
    description: 'Accelerate your Vercel builds with Flash Install for faster dependency installation',
    version: '1.0.0',
    endpoints: {
      callback: '/api/callback',
      configure: '/configuration',
      webhook: '/api/webhooks'
    }
  });
}
