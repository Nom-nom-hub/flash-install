"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { exchangeCodeForAccessToken } from "~/app/callback/actions/exchange-code-for-access-token";

// The URL of this page should be added as Redirect URL in your integration settings on Vercel
export default function Page() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const configurationId = searchParams.get("configurationId");
  const teamId = searchParams.get("teamId");

  const [_, exchange] = useTransition();

  useEffect(() => {
    if (!code) {
      setError("Missing authorization code");
      setIsLoading(false);
      return;
    }

    exchange(async () => {
      try {
        const result = await exchangeCodeForAccessToken(code);
        console.log("Authentication successful:", result);

        // Automatically redirect to the configuration page or back to Vercel
        if (configurationId) {
          const configUrl = `/configure?configurationId=${configurationId}${teamId ? `&teamId=${teamId}` : ''}`;
          router.push(configUrl);
        } else if (next) {
          // If no configurationId but we have a next URL, redirect back to Vercel
          window.location.href = next;
        } else {
          // If neither configurationId nor next is available, redirect to Vercel dashboard
          window.location.href = "https://vercel.com/dashboard";
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setError("Failed to authenticate with Vercel");
        setIsLoading(false);
      }
    });
  }, [code, configurationId, teamId, next, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mb-4"></div>
        <h2 className="text-xl font-semibold text-white">Authenticating with Vercel...</h2>
        <p className="text-gray-400 mt-2">Please wait while we set up Flash Install for your account.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-4">
          <h2 className="text-xl font-semibold">Authentication Error</h2>
          <p className="mt-2">{error}</p>
        </div>

        <div className="mt-6">
          <a
            href={next || "https://vercel.com/dashboard"}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-md font-medium"
          >
            Return to Vercel
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mb-4"></div>
      <h2 className="text-xl font-semibold text-white">Redirecting...</h2>
      <p className="text-gray-400 mt-2">You'll be redirected to the configuration page automatically.</p>

      {next && (
        <div className="mt-6">
          <a
            href={next}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-md font-medium"
          >
            Return to Vercel
          </a>
        </div>
      )}
    </div>
  );
}
