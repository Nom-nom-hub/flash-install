# Flash Install Vercel Integration

This is the deployment package for the Flash Install Vercel integration. It provides a web interface and API endpoints for the Vercel marketplace integration.

## Development

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This integration is designed to be deployed to Vercel. To deploy:

```bash
vercel
```

Once you're satisfied with the preview, deploy to production:

```bash
vercel --prod
```

## Integration Structure

- `pages/index.js` - Landing page for the integration
- `pages/configuration.js` - Configuration UI for the integration
- `pages/api/webhooks.js` - Webhook handler for integration lifecycle events
- `public/logo.png` - Flash Install logo
- `styles/` - CSS modules for styling

## Vercel Integration Configuration

After deploying this application, you'll need to register it as a Vercel integration:

1. Go to the [Vercel Integrations Console](https://vercel.com/dashboard/integrations)
2. Click "Create" to create a new integration
3. Fill in the required information:
   - **Name**: Flash Install
   - **Description**: Accelerate your Vercel builds with Flash Install for faster dependency installation
   - **Logo**: Upload the Flash Install logo
   - **Category**: Developer Tools
   - **Redirect URL**: Your deployed application URL
   - **Webhook URL**: Your deployed application URL + `/api/webhooks`

## Documentation

For detailed documentation on the Flash Install Vercel integration, see the [Vercel Integration Guide](../../docs/vercel-integration-guide.md).
