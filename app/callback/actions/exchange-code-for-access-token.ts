"use server";

import qs from "querystring";

export async function exchangeCodeForAccessToken(code: string) {
  /*
    Exchange the code for a long-lived access token.
    Note: This call can only be made once per code.
  */
  try {
    console.log("Exchanging code for access token...");
    console.log("Client ID:", process.env.CLIENT_ID);
    console.log("Redirect URI:", `${process.env.HOST}/callback`);
    
    const result = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.HOST}/callback`, // This parameter should match the Redirect URL in your integration settings on Vercel
      }),
    });

    if (!result.ok) {
      console.error("Error exchanging code for token:", result.status, result.statusText);
      throw new Error(`Failed to exchange code for token: ${result.status} ${result.statusText}`);
    }

    const body = await result.json();

    // Always log in production for debugging during integration setup
    console.log(
      "https://api.vercel.com/v2/oauth/access_token returned:",
      JSON.stringify(body, null, 2)
    );

    if (body.error) {
      throw new Error(`OAuth error: ${body.error} - ${body.error_description || 'Unknown error'}`);
    }

    return body as {
      token_type: string;
      access_token: string;
      installation_id: string;
      user_id: string;
      team_id: string | null;
    };
  } catch (error) {
    console.error("Error in exchangeCodeForAccessToken:", error);
    throw error;
  }
}
