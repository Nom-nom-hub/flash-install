import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.HOST + '/callback';
  
  // Construct the authorization URL
  const authUrl = `https://vercel.com/api/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=integration-configuration:read-write&response_type=code`;
  
  // Redirect to Vercel's OAuth authorization endpoint
  return NextResponse.redirect(authUrl);
}
