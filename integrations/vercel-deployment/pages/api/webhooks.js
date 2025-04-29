/**
 * Webhook handler for Vercel integration lifecycle events
 */

export default function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the webhook type from the URL path
    const webhookType = req.query.type;
    
    if (!webhookType) {
      return res.status(400).json({ error: 'Missing webhook type' });
    }
    
    // Extract data from request body
    const { teamId, configurationId, configuration } = req.body;
    
    if (!teamId || !configurationId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Handle different webhook types
    switch (webhookType) {
      case 'install':
        // Handle integration installation
        console.log(`Installing flash-install integration for team ${teamId}`);
        
        // This would typically store the configuration in a database
        // For now, we'll just return success
        return res.status(200).json({ success: true });
        
      case 'uninstall':
        // Handle integration uninstallation
        console.log(`Uninstalling flash-install integration for team ${teamId}`);
        
        // This would typically clean up resources in a database
        // For now, we'll just return success
        return res.status(200).json({ success: true });
        
      case 'configuration-update':
        // Handle configuration updates
        console.log(`Updating configuration for team ${teamId}`);
        console.log('New configuration:', configuration);
        
        // This would typically update the configuration in a database
        // For now, we'll just return success
        return res.status(200).json({ success: true });
        
      default:
        return res.status(400).json({ error: 'Invalid webhook type' });
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}
