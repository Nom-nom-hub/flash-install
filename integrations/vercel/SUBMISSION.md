# Submitting flash-install to Vercel Marketplace

This document outlines the steps required to submit the flash-install integration to the Vercel Marketplace.

## Prerequisites

1. A Vercel account with access to the [Vercel Integrations Console](https://vercel.com/dashboard/integrations)
2. The flash-install integration codebase (this directory)
3. A deployed version of the integration (on Vercel)

## Submission Process

### 1. Deploy the Integration

First, deploy the integration to Vercel:

```bash
cd integrations/vercel
vercel
```

This will deploy the integration to a Vercel preview URL. Once you're satisfied with the integration, deploy it to production:

```bash
vercel --prod
```

### 2. Register the Integration

1. Go to the [Vercel Integrations Console](https://vercel.com/dashboard/integrations)
2. Click "Create" to create a new integration
3. Fill in the required information:
   - **Name**: flash-install
   - **Description**: Accelerate your Vercel builds with flash-install for faster dependency installation
   - **Logo**: Upload the flash-install logo (SVG format)
   - **Category**: Developer Tools
   - **Redirect URL**: Your deployed integration URL
   - **Webhook URL**: Your deployed integration webhook URL (typically `https://your-integration-url/api/webhooks`)

### 3. Configure Integration Settings

1. Set up the required scopes:
   - `builds:read` - To access build information
   - `builds:write` - To modify build processes
   - `team:read` - To access team information for cache sharing

2. Configure the UI settings to match the schema defined in `withVercelIntegration.js`

3. Set up the pricing plans as defined in `vercel.json`

### 4. Submit for Review

1. Complete all required fields in the Vercel Integration Console
2. Submit the integration for review by clicking "Submit for Review"
3. Vercel will review the integration and provide feedback if necessary
4. Once approved, the integration will be listed in the Vercel Marketplace

## Testing Before Submission

Before submitting the integration, thoroughly test it with different project types:

1. Create a test Next.js project and install the integration
2. Verify that dependency installation is faster with flash-install
3. Check that metrics are being collected correctly
4. Test with different package managers (npm, yarn, pnpm, bun)

## Post-Submission

After submitting the integration:

1. Be prepared to respond to feedback from the Vercel team
2. Have documentation ready for users
3. Set up support channels for integration users

## Resources

- [Vercel Integration Documentation](https://vercel.com/docs/integrations)
- [Example Marketplace Integration](https://github.com/vercel/example-marketplace-integration)
- [Vercel API Documentation](https://vercel.com/docs/api)

## Contact

For questions about the submission process, contact Vercel at integrations@vercel.com or the flash-install team at support@flash-install.dev.