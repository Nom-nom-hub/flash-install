# Vercel Marketplace Submission Checklist

Use this checklist to ensure you've completed all necessary steps for submitting Flash Install to the Vercel Marketplace.

## Pre-Submission

- [ ] Deploy the integration UI to Vercel
  - [ ] `cd integrations/vercel-deployment`
  - [ ] `vercel login`
  - [ ] `vercel --prod`
  - [ ] Note the production URL: ______________________

- [ ] Test the deployed integration
  - [ ] Verify the landing page loads correctly
  - [ ] Verify the configuration page works
  - [ ] Test the webhook endpoint

- [ ] Prepare all submission materials
  - [ ] Review SUBMISSION_TEXT.md for accuracy
  - [ ] Ensure logo meets Vercel requirements (square, 160x160px minimum)
  - [ ] Prepare screenshots of the integration in action

## Submission Process

- [ ] Go to [Vercel Integrations Console](https://vercel.com/dashboard/integrations)
- [ ] Click "Create" to create a new integration
- [ ] Fill in basic information:
  - [ ] Name: Flash Install
  - [ ] Slug: flash-install
  - [ ] Description (short and long)
  - [ ] Category: Developer Tools
  - [ ] Tags

- [ ] Upload logo and screenshots
  - [ ] Primary logo
  - [ ] Screenshots of the integration

- [ ] Configure integration details:
  - [ ] Redirect URL: Your deployed UI URL
  - [ ] Webhook URL: Your deployed webhook URL
  - [ ] Required scopes (builds:read, builds:write, team:read)

- [ ] Set up configuration options:
  - [ ] enableCache (boolean, default: true)
  - [ ] cacheCompression (boolean, default: true)
  - [ ] concurrency (number, default: 4)
  - [ ] fallbackToNpm (boolean, default: true)

- [ ] Configure pricing (if applicable)
  - [ ] Free tier
  - [ ] Pro tier
  - [ ] Enterprise tier

- [ ] Preview the integration
  - [ ] Verify all information is correct
  - [ ] Test the integration flow

- [ ] Submit for review

## Post-Submission

- [ ] Monitor submission status
- [ ] Respond to any feedback from Vercel
- [ ] Prepare for launch:
  - [ ] Update documentation with actual Marketplace link
  - [ ] Prepare marketing materials with actual link
  - [ ] Set up monitoring for support channels

## Launch

- [ ] Announce on social media
- [ ] Send email announcement
- [ ] Update GitHub repository with integration information
- [ ] Monitor usage and feedback
