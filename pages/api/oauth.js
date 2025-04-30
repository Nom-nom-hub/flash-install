/**
 * OAuth configuration endpoint for Vercel integration
 */

export default function handler(req, res) {
  // This endpoint would typically handle OAuth configuration
  // For now, we'll just return a success message with some standard OAuth configuration
  return res.status(200).json({
    clientId: 'flash-install-vercel-integration',
    authorizeUrl: 'https://vercel.com/oauth/authorize',
    tokenUrl: 'https://vercel.com/oauth/token',
    redirectUri: 'https://flash-install-vercel-qtqu1654u-flash-install.vercel.app/api/callback'
  });
}
