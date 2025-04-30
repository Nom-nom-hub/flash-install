import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const { code, state, configurationId, teamId } = router.query;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have authentication parameters
    if (code && state) {
      console.log('Authentication parameters detected');
      // In a real implementation, you would exchange the code for an access token
      // For now, we'll just simulate a successful authentication
      setIsAuthenticated(true);

      // If we have a configurationId, redirect to the configuration page
      if (configurationId) {
        router.push(`/configuration?configurationId=${configurationId}&teamId=${teamId || ''}`);
      }
    }

    setIsLoading(false);
  }, [code, state, configurationId, teamId, router]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        padding: '0 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        color: '#fff'
      }}>
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div style={{
      minHeight: '100vh',
      padding: '0 0.5rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000',
      color: '#fff'
    }}>
      <Head>
        <title>Flash Install for Vercel</title>
        <meta name="description" content="Accelerate your Vercel builds with Flash Install" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <main style={{
        padding: '5rem 0',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '1200px',
        width: '100%'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Flash Install Logo" width={200} height={200} />
        </div>

        <h1 style={{
          margin: 0,
          lineHeight: 1.15,
          fontSize: '4rem',
          textAlign: 'center'
        }}>
          <span style={{ color: '#ffcc00' }}>Flash Install</span> for Vercel
        </h1>

        <p style={{
          lineHeight: 1.5,
          fontSize: '1.5rem',
          textAlign: 'center',
          margin: '1rem 0 3rem',
          color: '#ccc'
        }}>
          Accelerate your Vercel builds with faster dependency installation
        </p>

        {isAuthenticated ? (
          <div style={{
            margin: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#eaeaea',
            border: '1px solid #333',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '600px',
            backgroundColor: '#111'
          }}>
            <h2 style={{ color: '#0070f3' }}>Authentication Successful</h2>
            <p>You have successfully authenticated with Vercel.</p>
            <button
              onClick={() => router.push('/configuration')}
              style={{
                backgroundColor: '#ffcc00',
                color: '#000',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '1.25rem',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginTop: '1rem'
              }}
            >
              Configure Flash Install
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: '1200px',
            marginTop: '3rem'
          }}>
            <div style={{
              margin: '1rem',
              padding: '1.5rem',
              textAlign: 'left',
              color: '#eaeaea',
              textDecoration: 'none',
              border: '1px solid #333',
              borderRadius: '10px',
              width: '45%',
              backgroundColor: '#111'
            }}>
              <h2 style={{ color: '#0070f3' }}>Faster Builds &rarr;</h2>
              <p>Reduce dependency installation time by up to 50% compared to standard npm install.</p>
            </div>

            <div style={{
              margin: '1rem',
              padding: '1.5rem',
              textAlign: 'left',
              color: '#eaeaea',
              textDecoration: 'none',
              border: '1px solid #333',
              borderRadius: '10px',
              width: '45%',
              backgroundColor: '#111'
            }}>
              <h2 style={{ color: '#0070f3' }}>Intelligent Caching &rarr;</h2>
              <p>Smart caching ensures consistent, reliable builds and avoids redundant downloads.</p>
            </div>

            <div style={{
              margin: '1rem',
              padding: '1.5rem',
              textAlign: 'left',
              color: '#eaeaea',
              textDecoration: 'none',
              border: '1px solid #333',
              borderRadius: '10px',
              width: '45%',
              backgroundColor: '#111'
            }}>
              <h2 style={{ color: '#0070f3' }}>Framework Agnostic &rarr;</h2>
              <p>Works with Next.js, Remix, Astro, SvelteKit, and more.</p>
            </div>

            <div style={{
              margin: '1rem',
              padding: '1.5rem',
              textAlign: 'left',
              color: '#eaeaea',
              textDecoration: 'none',
              border: '1px solid #333',
              borderRadius: '10px',
              width: '45%',
              backgroundColor: '#111'
            }}>
              <h2 style={{ color: '#0070f3' }}>Zero Configuration &rarr;</h2>
              <p>Works out of the box with sensible defaults. No complex setup required.</p>
            </div>
          </div>
        )}
      </main>

      <footer style={{
        width: '100%',
        height: '100px',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#888'
      }}>
        <a
          href="https://github.com/flash-install-cli/flash-install"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888', textDecoration: 'none' }}
        >
          Powered by Flash Install
        </a>
      </footer>
    </div>
  );
}
