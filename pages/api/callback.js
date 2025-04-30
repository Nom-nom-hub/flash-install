/**
 * OAuth callback handler for Vercel integration
 */

export default async function handler(req, res) {
  // Get the code and state from the query parameters
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing required code parameter' });
  }

  try {
    // Exchange the code for an access token
    const clientId = 'oac_w68OgPvIyMqcmttdY73CJTU9';
    const clientSecret = 'reRKq4dBHEKMhJg7XyDBZwkM';
    const redirectUri = 'https://flash-install-vercel-870sz9g3m-flash-install.vercel.app/api/callback';

    // In a real implementation, we would make a request to Vercel's token endpoint
    // For now, we'll simulate a successful token exchange

    // Redirect to the configuration page with the necessary parameters
    const configurationId = req.query.configurationId || 'default';
    const teamId = req.query.teamId || '';

    // Redirect to the configuration page
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <meta http-equiv="refresh" content="0;URL='/configuration?configurationId=${configurationId}&teamId=${teamId}'" />
        </head>
        <body>
          <p>Authentication successful. Redirecting to configuration...</p>
          <script>
            window.location.href = "/configuration?configurationId=${configurationId}&teamId=${teamId}";
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return res.status(500).json({ error: 'Failed to exchange code for token' });
  }
}
