/**
 * Catch-all API endpoint for Vercel integration
 */

export default function handler(req, res) {
  // Log the request for debugging
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });

  // Return a generic success response
  return res.status(200).json({
    success: true,
    message: 'Flash Install API endpoint',
    path: req.query.path,
    query: req.query,
    method: req.method
  });
}
