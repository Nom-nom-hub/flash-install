import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Log the webhook payload for debugging
    console.log('Received webhook:', JSON.stringify(payload, null, 2));
    
    // Handle different webhook events
    switch (payload.type) {
      case 'integration-configuration.created':
        // Handle new integration installation
        console.log('New integration installed:', payload.payload.configurationId);
        break;
      
      case 'integration-configuration.removed':
        // Handle integration uninstallation
        console.log('Integration uninstalled:', payload.payload.configurationId);
        break;
      
      case 'deployment':
        // Handle deployment events
        console.log('Deployment event:', payload.payload.deploymentId);
        break;
      
      default:
        console.log('Unhandled webhook type:', payload.type);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }
}
