import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.HOST + '/callback';
  const scope = 'integration-configuration:read-write deployments:read-write projects:read-write';
  
  // Redirect to Vercel's OAuth authorization endpoint
  const authUrl = `https://vercel.com/api/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;
  
  return NextResponse.redirect(authUrl);
}
