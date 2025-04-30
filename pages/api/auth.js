/**
 * OAuth handler for Vercel integration
 */

export default function handler(req, res) {
  // This is a simple OAuth handler that will redirect to Vercel's OAuth flow
  const clientId = 'oac_w68OgPvIyMqcmttdY73CJTU9';
  const redirectUri = 'https://flash-install-vercel-870sz9g3m-flash-install.vercel.app/api/callback';
  const scope = 'integration-configuration:read-write deployments:read-write projects:read teams:read';

  // Redirect to Vercel's OAuth authorization endpoint
  const authUrl = `https://vercel.com/api/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

  res.redirect(authUrl);
}
